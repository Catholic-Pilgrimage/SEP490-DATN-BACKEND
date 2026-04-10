const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
    TARGET: path.join(ROOT, 'services', 'pilgrim', 'plannerAntiFraudService.js'),
    MODELS: path.join(ROOT, 'models', 'index.js'),
    PLANNER_ITEM_MODEL: path.join(ROOT, 'models', 'PlannerItem.js'),
    LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
    DATABASE: path.join(ROOT, 'config', 'database.js'),
    WALLET_SERVICE: path.join(ROOT, 'services', 'pilgrim', 'walletService.js'),
};

function setMock(modulePath, exports) {
    require.cache[modulePath] = {
        id: modulePath,
        filename: modulePath,
        loaded: true,
        exports,
    };
}

function clearModules() {
    Object.values(MODULES).forEach((modulePath) => {
        delete require.cache[modulePath];
    });
}

function loadAntiFraudService(overrides = {}) {
    clearModules();

    const state = {
        plannerFindByPkCalls: [],
        plannerMemberFindAllCalls: [],
        plannerMemberUpdateCalls: [],
        userCheckinFindAllCalls: [],
        walletFindOneCalls: [],
        walletSaveCalls: [],
        transactionFindAllCalls: [],
        transactionCreateCalls: [],
        transactionSaveCalls: [],
        walletRefundDepositCalls: [],
        walletApplyPenaltyCalls: [],
        infoLogs: [],
        warnLogs: [],
        errorLogs: [],
    };

    const transaction = {
        id: 'tx-settle',
        finished: null,
        commit: async () => { transaction.finished = 'commit'; },
        rollback: async () => { transaction.finished = 'rollback'; },
    };

    // Mock PlannerItem model (used via require inside the service)
    setMock(MODULES.PLANNER_ITEM_MODEL, { name: 'PlannerItem' });

    setMock(MODULES.MODELS, {
        Planner: {
            findByPk: async (id, options) => {
                state.plannerFindByPkCalls.push({ id, options });
                if (overrides.plannerFindByPk) return overrides.plannerFindByPk(id, options, state);
                return null;
            },
        },
        PlannerMember: {
            findAll: async (options) => {
                state.plannerMemberFindAllCalls.push(options);
                if (overrides.plannerMemberFindAll) return overrides.plannerMemberFindAll(options, state);
                return [];
            },
            update: async (values, options) => {
                state.plannerMemberUpdateCalls.push({ values, options });
                if (overrides.plannerMemberUpdate) return overrides.plannerMemberUpdate(values, options, state);
                return [1];
            },
        },
        UserCheckin: {
            findAll: async (options) => {
                state.userCheckinFindAllCalls.push(options);
                if (overrides.userCheckinFindAll) return overrides.userCheckinFindAll(options, state);
                return [];
            },
        },
        Wallet: {
            findOne: async (options) => {
                state.walletFindOneCalls.push(options);
                if (overrides.walletFindOne) return overrides.walletFindOne(options, state);
                return null;
            },
        },
        Transaction: {
            findAll: async (options) => {
                state.transactionFindAllCalls.push(options);
                if (overrides.transactionFindAll) return overrides.transactionFindAll(options, state);
                return [];
            },
            create: async (data, options) => {
                state.transactionCreateCalls.push({ data, options });
                if (overrides.transactionCreate) return overrides.transactionCreate(data, options, state);
                return { id: 'txn-id', ...data };
            },
        },
        User: {},
    });

    setMock(MODULES.LOGGER, {
        info: (...args) => state.infoLogs.push(args),
        warn: (...args) => state.warnLogs.push(args),
        error: (...args) => state.errorLogs.push(args),
    });

    setMock(MODULES.DATABASE, {
        transaction: async () => transaction,
    });

    setMock(MODULES.WALLET_SERVICE, {
        generateTxnCode: () => 'TXN-TEST-001',
        applyPenalty: async (memberUserId, ownerUserId, depositAmount, penaltyPercentage, plannerId, plannerName, t) => {
            state.walletApplyPenaltyCalls.push({ memberUserId, ownerUserId, depositAmount, penaltyPercentage, plannerId, plannerName });
            if (overrides.walletApplyPenalty) return overrides.walletApplyPenalty(memberUserId, ownerUserId, depositAmount, penaltyPercentage, plannerId, plannerName, t, state);
            const penaltyAmount = depositAmount * (penaltyPercentage / 100);
            return { penaltyAmount, refundAmount: depositAmount - penaltyAmount, penaltyTransactionId: 'ptxn-id' };
        },
        refundDeposit: async (userId, amount, plannerId, description, t) => {
            state.walletRefundDepositCalls.push({ userId, amount, plannerId, description });
            if (overrides.walletRefundDeposit) return overrides.walletRefundDeposit(userId, amount, plannerId, description, t, state);
            return {};
        },
    });

    const AntiFraudService = require(MODULES.TARGET);

    return { AntiFraudService, state, transaction };
}

module.exports = { loadAntiFraudService };
