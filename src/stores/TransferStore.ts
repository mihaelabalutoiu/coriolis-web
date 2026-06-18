/*
Copyright (C) 2017  Cloudbase Solutions SRL
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.
You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { observable, action, runInAction } from "mobx";

import TransferSource, {
  TransferSourceUtils,
} from "@src/sources/TransferSource";
import type {
  UpdateData,
  TransferItem,
  TransferItemDetails,
} from "@src/@types/MainItem";
import type { Execution, ExecutionTasks } from "@src/@types/Execution";
import type { Endpoint } from "@src/@types/Endpoint";
import type { Field } from "@src/@types/Field";
import apiCaller from "@src/utils/ApiCaller";
import notificationStore from "./NotificationStore";

class TransferStoreUtils {
  static getNewTransfer(
    transferDetails: TransferItemDetails,
    execution: Execution,
  ): TransferItemDetails {
    if (transferDetails.executions) {
      return {
        ...transferDetails,
        executions: [
          ...transferDetails.executions.filter(e => e.id !== execution.id),
          execution,
        ],
      };
    }

    return {
      ...transferDetails,
      executions: [execution],
    };
  }
}

class TransferStore {
  @observable transfers: TransferItem[] = [];

  @observable loading = false;

  @observable transferDetails: TransferItemDetails | null = null;

  @observable transferDetailsLoading = false;

  @observable executionsTasks: ExecutionTasks[] = [];

  @observable executionsTasksLoading = false;

  @observable backgroundLoading = false;

  @observable startingExecution = false;

  @observable transfersWithDisks: TransferItem[] = [];

  @observable transfersWithDisksLoading = false;

  @observable transfersPage = 1;

  @observable transfersHasNextPage = false;

  @observable transfersItemsPerPage = 25;

  transfersLoaded = false;

  private transferPageMarkers: (string | null)[] = [null];

  @observable executionsList: Execution[] = [];

  @observable executionsHasOlderPage = false;

  @observable executionsLoading = false;

  @observable executionsPaginationLoading = false;

  executionsPageSize = 10;

  private deletedExecutionIds: Set<string> = new Set();

  @action resetTransferPagination(): void {
    this.transfersPage = 1;
    this.transfersHasNextPage = false;
    this.transferPageMarkers = [null];
  }

  @action resetExecutionsPagination(): void {
    this.executionsList = [];
    this.executionsHasOlderPage = false;
    this.executionsLoading = false;
    this.executionsPaginationLoading = false;
  }

  @action async getTransferExecutions(options?: {
    showLoading?: boolean;
    polling?: boolean;
  }): Promise<void> {
    const transferId = this.transferDetails?.id;
    if (!transferId) {
      return;
    }

    if (options?.showLoading) {
      this.executionsLoading = true;
    }

    try {
      const raw = await TransferSource.getExecutions(transferId, {
        limit: this.executionsPageSize,
      });
      const hasOlderPage = raw.length === this.executionsPageSize;
      TransferSourceUtils.sortExecutions(raw);
      runInAction(() => {
        this.executionsList = raw;
        this.executionsHasOlderPage = hasOlderPage;
        this.executionsLoading = false;
      });
      // Warm the cache for this page so clicking the bullets is instant.
      this.prefetchExecutionsTasks(raw);
    } catch (err) {
      runInAction(() => {
        this.executionsLoading = false;
      });
      console.error(err);
    }
  }

  @action async loadOlderExecutions(): Promise<void> {
    const transferId = this.transferDetails?.id;
    if (
      !transferId ||
      !this.executionsHasOlderPage ||
      this.executionsLoading ||
      this.executionsPaginationLoading
    ) {
      return;
    }

    const marker = this.executionsList[0]?.id;
    if (!marker) {
      return;
    }

    this.executionsPaginationLoading = true;

    try {
      const raw = await TransferSource.getExecutions(transferId, {
        limit: this.executionsPageSize,
        marker,
        quietError: true,
      });
      const hasOlderPage = raw.length === this.executionsPageSize;
      TransferSourceUtils.sortExecutions(raw);
      runInAction(() => {
        this.executionsList = [...raw, ...this.executionsList];
        this.executionsHasOlderPage = hasOlderPage;
        this.executionsPaginationLoading = false;
      });
      // Warm the cache for the newly loaded older page.
      this.prefetchExecutionsTasks(raw);
    } catch (err) {
      console.error(err);
      runInAction(() => {
        this.executionsHasOlderPage = false;
        this.executionsPaginationLoading = false;
      });
      console.error(err);
    }
  }

  @action async setTransfersPage(page: number): Promise<void> {
    this.transfersPage = page;
    await this.getTransfers({ showLoading: true });
  }

  @action async setTransfersItemsPerPage(itemsPerPage: number): Promise<void> {
    this.transfersItemsPerPage = itemsPerPage;
    this.transfersPage = 1;
    this.transferPageMarkers = [null];
    this.transfersHasNextPage = false;
    await this.getTransfers({ showLoading: true });
  }

  @action async getTransfers(options?: {
    showLoading?: boolean;
    skipLog?: boolean;
    quietError?: boolean;
  }): Promise<void> {
    this.backgroundLoading = true;

    if ((options && options.showLoading) || !this.transfersLoaded) {
      this.loading = true;
    }

    const marker = this.transferPageMarkers[this.transfersPage - 1] ?? null;
    const isPaginationRequest = marker !== null;

    try {
      const raw = await TransferSource.getTransfers({
        skipLog: options?.skipLog,
        quietError: options?.quietError || isPaginationRequest,
        limit: this.transfersItemsPerPage,
        marker,
      });
      if (isPaginationRequest && raw.length === 0) {
        runInAction(() => {
          this.transfersHasNextPage = false;
          this.transfersPage = Math.max(1, this.transfersPage - 1);
        });
        return;
      }
      const hasNextPage = raw.length === this.transfersItemsPerPage;
      const nextMarker = raw.length > 0 ? raw[raw.length - 1].id : null;
      this.getTransfersSuccess(raw, hasNextPage, nextMarker);
    } catch (err) {
      if (isPaginationRequest) {
        runInAction(() => {
          this.transfersHasNextPage = false;
          this.transfersPage = Math.max(1, this.transfersPage - 1);
        });
        return;
      }
      throw err;
    } finally {
      this.getTransfersDone();
    }
  }

  @action cancelTransferDetails() {
    if (this.transferDetails?.id) {
      apiCaller.cancelRequests(this.transferDetails?.id);
    }
    this.transferDetailsLoading = false;
  }

  @action async getTransferDetails(options: {
    transferId: string;
    showLoading?: boolean;
    polling?: boolean;
    includeTaskInfo?: boolean;
  }) {
    const {
      transferId: transferId,
      showLoading,
      polling,
      includeTaskInfo,
    } = options;

    if (showLoading) {
      this.transferDetailsLoading = true;
    }

    try {
      const transfer = await TransferSource.getTransferDetails({
        transferId: transferId,
        polling,
        includeTaskInfo,
      });

      // The transfer payload no longer embeds its executions, so refresh the
      // most recent page from the dedicated executions endpoint to keep the
      // timeline statuses live and to surface newly started executions. Only
      // needed once the executions list has been loaded. During polling, only
      // refresh when the latest execution is still active — otherwise a
      // completed transfer would re-fetch executions on every poll cycle.
      const activeStatuses = [
        "RUNNING",
        "PENDING",
        "CANCELLING",
        "AWAITING_MINION_ALLOCATIONS",
      ];
      // Keep refreshing while either the transfer reports an active execution
      // (catches newly started executions) OR our own latest known execution is
      // still active (so we capture its final RUNNING -> COMPLETED/ERROR
      // transition before we stop refreshing).
      const newestExecution =
        this.executionsList[this.executionsList.length - 1];
      const hasActiveExecution =
        activeStatuses.includes(transfer.last_execution_status) ||
        (newestExecution != null &&
          activeStatuses.includes(newestExecution.status));
      const shouldRefreshExecutions =
        this.executionsList.length > 0 && (!polling || hasActiveExecution);
      let freshExecutions: Execution[] | null = null;
      if (shouldRefreshExecutions) {
        try {
          freshExecutions = await TransferSource.getExecutions(transferId, {
            limit: this.executionsPageSize,
            quietError: polling,
          });
          TransferSourceUtils.sortExecutions(freshExecutions);
        } catch (err) {
          console.error(err);
        }
      }

      runInAction(() => {
        this.transferDetails = transfer;

        if (freshExecutions) {
          let statusChanged = false;
          const updatedList = this.executionsList.map(e => {
            const fresh = freshExecutions!.find(te => te.id === e.id);
            if (fresh && fresh.status !== e.status) {
              statusChanged = true;
              return { ...e, status: fresh.status };
            }
            return e;
          });
          if (statusChanged) {
            this.executionsList = updatedList;
          }

          if (this.executionsList.length > 0) {
            const newestNumber = Math.max(
              ...this.executionsList.map(e => e.number),
            );
            const incoming = freshExecutions.filter(
              e =>
                e.number > newestNumber &&
                !this.deletedExecutionIds.has(e.id) &&
                !this.executionsList.find(l => l.id === e.id),
            );
            if (incoming.length > 0) {
              this.executionsList = [...this.executionsList, ...incoming];
            }
          }
        }
      });
    } finally {
      runInAction(() => {
        this.transferDetailsLoading = false;
      });
    }
  }

  @action clearDetails() {
    this.transferDetails = null;
    this.currentlyLoadingExecution = "";
    this.executionsTasks = [];
    this.deletedExecutionIds.clear();
  }

  @action getTransfersSuccess(
    transfers: TransferItem[],
    hasNextPage = false,
    nextMarker: string | null = null,
  ) {
    this.transfersLoaded = true;
    this.transfers = transfers;
    this.transfersHasNextPage = hasNextPage;
    if (nextMarker !== null) {
      this.transferPageMarkers[this.transfersPage] = nextMarker;
    }
  }

  @action getTransfersDone() {
    this.loading = false;
    this.backgroundLoading = false;
  }

  currentlyLoadingExecution = "";

  // Execution ids whose tasks are currently being fetched, keyed per id so a
  // failed/evicted load can be retried (see getExecutionTasks).
  private loadingExecutionTaskIds: Set<string> = new Set();

  @action async getExecutionTasks(options: {
    transferId: string;
    executionId?: string;
    polling?: boolean;
  }) {
    const { transferId: transferId, executionId, polling } = options;
    // Capture the execution we are actually loading in a local. Everything
    // below (the fetch, the store update, the in-flight bookkeeping) must use
    // this `targetId` rather than the mutable `this.currentlyLoadingExecution`,
    // which can change while we await — otherwise a fetch resolving for one
    // execution can evict another execution's tasks from the store.
    const targetId = polling
      ? this.currentlyLoadingExecution
      : executionId || "";
    if (!targetId) {
      return;
    }

    if (!polling) {
      this.currentlyLoadingExecution = targetId;
      // Tasks already loaded — this execution is ready, so clear any spinner
      // left over from a previous (different) execution's in-flight load.
      if (this.executionsTasks.find(e => e.id === targetId)) {
        this.executionsTasksLoading = false;
        return;
      }
      // A fetch for this execution is already in flight — don't duplicate it,
      // but make sure the spinner reflects that this execution is loading.
      // NOTE: keyed per execution id (not a single mutable field) so that an
      // execution whose previous load failed/was evicted can be retried.
      if (this.loadingExecutionTaskIds.has(targetId)) {
        this.executionsTasksLoading = true;
        return;
      }
      this.loadingExecutionTaskIds.add(targetId);
      this.executionsTasksLoading = true;
    }

    try {
      const executionTasks = await TransferSource.getExecutionTasks({
        transferId: transferId,
        executionId: targetId,
        polling,
      });
      runInAction(() => {
        this.executionsTasks = [
          ...this.executionsTasks.filter(e => e.id !== targetId),
          executionTasks,
        ];
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (!polling) {
        runInAction(() => {
          this.loadingExecutionTaskIds.delete(targetId);
          // Only clear the spinner if we are still on the execution we loaded.
          if (this.currentlyLoadingExecution === targetId) {
            this.executionsTasksLoading = false;
          }
        });
      }
    }
  }

  // Prefetch the tasks for a whole page of executions in the background, so that
  // clicking through the timeline bullets is instant (served from the
  // executionsTasks cache) instead of firing a request per bullet. Bounded to
  // the page size, so it never reloads the full execution/task history.
  @action async prefetchExecutionsTasks(executions: Execution[]): Promise<void> {
    const transferId = this.transferDetails?.id;
    if (!transferId) {
      return;
    }
    await Promise.all(
      executions.map(async execution => {
        // Skip executions whose tasks are already cached or already loading.
        if (
          this.executionsTasks.find(e => e.id === execution.id) ||
          this.loadingExecutionTaskIds.has(execution.id)
        ) {
          return;
        }
        this.loadingExecutionTaskIds.add(execution.id);
        try {
          const executionTasks = await TransferSource.getExecutionTasks({
            transferId,
            executionId: execution.id,
            polling: true, // background fetch: skip logging / quiet errors
          });
          runInAction(() => {
            if (!this.executionsTasks.find(e => e.id === execution.id)) {
              this.executionsTasks = [...this.executionsTasks, executionTasks];
            }
            // If the user clicked this bullet while it was still prefetching,
            // clear the spinner now that its tasks are available.
            if (this.currentlyLoadingExecution === execution.id) {
              this.executionsTasksLoading = false;
            }
          });
        } catch (err) {
          console.error(err);
        } finally {
          runInAction(() => {
            this.loadingExecutionTaskIds.delete(execution.id);
          });
        }
      }),
    );
  }

  @action async execute(transferId: string, fields?: Field[]): Promise<void> {
    this.startingExecution = true;

    const execution = await TransferSource.execute(transferId, fields);
    this.executeSuccess(transferId, execution);
  }

  @action executeSuccess(transferId: string, execution: Execution) {
    if (this.transferDetails?.id === transferId) {
      const updatedTransfer = TransferStoreUtils.getNewTransfer(
        this.transferDetails,
        execution,
      );
      this.transferDetails = updatedTransfer;

      if (!this.executionsList.find(e => e.id === execution.id)) {
        this.executionsList = [...this.executionsList, execution];
      }

      const withTasks = execution as ExecutionTasks;
      if (Array.isArray(withTasks.tasks)) {
        this.executionsTasks = [
          ...this.executionsTasks.filter(e => e.id !== execution.id),
          withTasks,
        ];
      }
    }
    this.getExecutionTasks({
      transferId: transferId,
      executionId: execution.id,
    });

    this.startingExecution = false;
  }

  async cancelExecution(options: {
    transferId: string;
    executionId?: string;
    force?: boolean;
  }): Promise<void> {
    await TransferSource.cancelExecution(options);
    runInAction(() => {
      if (options.executionId) {
        this.executionsList = this.executionsList.map(e =>
          e.id === options.executionId ? { ...e, status: "CANCELLING" } : e,
        );
      }
    });
    if (options.force) {
      notificationStore.alert("Force cancelled", "success");
    } else {
      notificationStore.alert("Cancelled", "success");
    }
  }

  async deleteExecution(
    transferId: string,
    executionId: string,
  ): Promise<void> {
    await TransferSource.deleteExecution(transferId, executionId);
    this.deleteExecutionSuccess(transferId, executionId);
    if (
      this.executionsList.length === 0 &&
      this.transferDetails?.id === transferId
    ) {
      this.resetExecutionsPagination();
      await this.getTransferExecutions({ showLoading: true });
    }
  }

  @action deleteExecutionSuccess(transferId: string, executionId: string) {
    this.deletedExecutionIds.add(executionId);
    let executions = [];

    if (this.transferDetails?.id === transferId) {
      executions = [
        ...this.transferDetails.executions.filter(e => e.id !== executionId),
      ];
      this.transferDetails.executions = executions;
    }
    this.executionsList = this.executionsList.filter(e => e.id !== executionId);
    this.executionsTasks = this.executionsTasks.filter(
      e => e.id !== executionId,
    );
    if (executionId === this.currentlyLoadingExecution) {
      this.currentlyLoadingExecution = "";
    }
  }

  async delete(transferId: string) {
    await TransferSource.delete(transferId);
    runInAction(() => {
      this.transfers = this.transfers.filter(r => r.id !== transferId);
    });
  }

  async deleteDisks(transferId: string) {
    const execution = await TransferSource.deleteDisks(transferId);
    this.deleteDisksSuccess(transferId, execution);
  }

  @action deleteDisksSuccess(transferId: string, execution: Execution) {
    if (this.transferDetails?.id === transferId) {
      const updatedTransfer = TransferStoreUtils.getNewTransfer(
        this.transferDetails,
        execution,
      );
      this.transferDetails = updatedTransfer;

      if (!this.executionsList.find(e => e.id === execution.id)) {
        this.executionsList = [...this.executionsList, execution];
      }

      const withTasks = execution as ExecutionTasks;
      if (Array.isArray(withTasks.tasks)) {
        this.executionsTasks = [
          ...this.executionsTasks.filter(e => e.id !== execution.id),
          withTasks,
        ];
      }
    }
    this.getExecutionTasks({
      transferId,
      executionId: execution.id,
    });
  }

  async update(options: {
    transfer: TransferItemDetails;
    sourceEndpoint: Endpoint;
    destinationEndpoint: Endpoint;
    updateData: UpdateData;
    defaultStorage: { value: string | null; busType?: string | null };
    storageConfigDefault: string;
  }) {
    await TransferSource.update(options);
  }

  // NOTE: executions are no longer embedded on the transfer payload, so callers
  // must pass the executions fetched from the dedicated endpoint, sorted
  // ascending by number (so the last element is the most recent).
  testTransferHasDisks(executions: Execution[]) {
    if (!executions || executions.length === 0) {
      return false;
    }
    if (!executions.find(e => e.type === "transfer_execution")) {
      return false;
    }
    const lastExecution = executions[executions.length - 1];
    if (
      lastExecution.type === "transfer_disks_delete" &&
      lastExecution.status === "COMPLETED"
    ) {
      return false;
    }
    return true;
  }

  @action
  async loadHaveTransfersDisks(transfers: TransferItem[]) {
    this.transfersWithDisksLoading = true;

    try {
      // Executions are no longer embedded on the transfer payload; fetch the
      // most recent page per transfer from the dedicated endpoint to determine
      // which ones still have disks.
      const results = await Promise.all(
        transfers.map(async transfer => {
          const executions = await TransferSource.getExecutions(transfer.id, {
            limit: this.executionsPageSize,
            quietError: true,
          });
          TransferSourceUtils.sortExecutions(executions);
          return { transfer, hasDisks: this.testTransferHasDisks(executions) };
        }),
      );

      runInAction(() => {
        this.transfersWithDisks = results
          .filter(r => r.hasDisks)
          .map(r => r.transfer);
      });
    } finally {
      runInAction(() => {
        this.transfersWithDisksLoading = false;
      });
    }
  }
}

export default new TransferStore();
