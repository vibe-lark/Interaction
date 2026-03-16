import { BlockitClient, InteractionChangesetType } from '@lark-opdev/block-docs-addon-api';
import { getCurrentUserId } from '../utils/user';

export const DocMiniApp = new BlockitClient().initAPI();

export const StoreService = {
  META_KEY: 'InteractiveApp_Meta_v1',

  async getRootData() {
    try {
      const data = await DocMiniApp.Interaction.getData();
      if (data && typeof data === 'object') return data;
    } catch (e) {}
    return {};
  },

  async updateRootData(mutator: (draft: any) => void) {
    const current = await this.getRootData();
    const next =
      typeof (globalThis as any).structuredClone === 'function'
        ? (globalThis as any).structuredClone(current || {})
        : JSON.parse(JSON.stringify(current || {}));
    mutator(next);
    await DocMiniApp.Interaction.setData({
      type: InteractionChangesetType.REPLACE,
      data: {
        path: [],
        value: next
      }
    });
    return next;
  },

  async getQuestionId() {
    try {
      const root = await this.getRootData();
      return root.activeQuestionId ?? null;
    } catch (e) {
    }
    return null;
  },

  async setQuestionId(qId: string) {
    await this.updateRootData((draft) => {
      draft.activeQuestionId = qId;
    });
  },

  async getGlobalData(qId: string) {
    try {
      const root = await this.getRootData();
      return root.global?.[qId] ?? null;
    } catch (e) {
    }
    return null;
  },

  async setGlobalData(qId: string, data: any) {
    await this.updateRootData((draft) => {
      if (!draft.global || typeof draft.global !== 'object') draft.global = {};
      draft.global[qId] = data;
    });
  },

  async getPrivateData(qId: string) {
    try {
      const userId = getCurrentUserId();
      const root = await this.getRootData();
      return root.private?.[qId]?.[userId] ?? null;
    } catch (e) {
    }
    return null;
  },

  async setPrivateData(qId: string, data: any) {
    const userId = getCurrentUserId();
    await this.updateRootData((draft) => {
      if (!draft.private || typeof draft.private[qId] !== 'object') {
        if (!draft.private || typeof draft.private !== 'object') draft.private = {};
        draft.private[qId] = {};
      }
      draft.private[qId][userId] = data;
    });
  }
};
