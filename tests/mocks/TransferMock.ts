import {
  DeploymentItem,
  DeploymentItemDetails,
  TransferItem,
  TransferItemDetails,
} from "@src/@types/MainItem";
import { EXECUTION_MOCK, TASK_MOCK } from "@tests/mocks/ExecutionsMock";
import { INSTANCE_MOCK } from "@tests/mocks/InstancesMock";

export const REPLICA_MOCK: TransferItem = {
  id: "replica-id",
  name: "replica-name",
  type: "transfer",
  scenario: "replica",
  description: "replica-description",
  notes: "replica-notes",
  created_at: "2023-11-26T12:00:00Z",
  updated_at: "2023-11-26T12:00:00Z",
  origin_endpoint_id: "vmware",
  destination_endpoint_id: "openstack",
  origin_minion_pool_id: "origin-minion-pool-id",
  destination_minion_pool_id: "destination-minion-pool-id",
  instances: ["instance-id"],
  info: {},
  destination_environment: {
    option_1: "option_1_value",
    object_option: {
      object_option_1: "object_option_1_value",
    },
    array_option: ["array_option_1_value", "array_option_2_value"],
    object_with_mappings: {
      mappings: [
        {
          source: "source_value",
          destination: "destination_value",
        },
      ],
      disk_mappings: {},
    },
    password: "password-value",
  },
  source_environment: {},
  transfer_result: {
    "instance-id": { ...INSTANCE_MOCK },
  },
  last_execution_status: "COMPLETED",
  user_id: "user-id",
  network_map: {
    // @ts-ignore
    "network-name": "network-name",
  },
  storage_mappings: {
    backend_mappings: [
      {
        destination: "destination_value",
        source: "source_value",
      },
    ],
    default: "default_value",
    disk_mappings: [
      {
        destination: "destination_value",
        disk_id: "disk_id_value",
      },
    ],
  },
};

export const REPLICA_ITEM_DETAILS_MOCK: TransferItemDetails = {
  ...REPLICA_MOCK,
  executions: [EXECUTION_MOCK],
};

export const MIGRATION_MOCK: DeploymentItem = {
  id: "migration-id",
  name: "migration-name",
  type: "deployment",
  transfer_id: "migration-transfer-id",
  transfer_scenario_type: "migration-scenario",
  description: "migration-description",
  notes: "migration-notes",
  created_at: "2023-11-26T12:00:00Z",
  updated_at: "2023-11-26T12:00:00Z",
  origin_endpoint_id: "openstack",
  destination_endpoint_id: "vmware",
  origin_minion_pool_id: "origin-minion-pool-id",
  destination_minion_pool_id: "destination-minion-pool-id",
  instances: ["instance-id"],
  info: {},
  destination_environment: {},
  source_environment: {},
  transfer_result: {},
  last_execution_status: "COMPLETED",
  user_id: "user-id",
};

export const DEPLOYMENT_MOCK: DeploymentItem = {
  id: "deployment-id",
  name: "deployment-name",
  type: "deployment",
  transfer_id: "deployment-transfer-id",
  transfer_scenario_type: "replica",
  description: "deployment-description",
  notes: "deployment-notes",
  created_at: "2023-11-26T12:00:00Z",
  updated_at: "2023-11-26T12:00:00Z",
  origin_endpoint_id: "openstack",
  destination_endpoint_id: "vmware",
  origin_minion_pool_id: "origin-minion-pool-id",
  destination_minion_pool_id: "destination-minion-pool-id",
  instances: ["instance-id"],
  info: {},
  destination_environment: {},
  source_environment: {},
  transfer_result: {},
  last_execution_status: "COMPLETED",
  user_id: "user-id",
};

export const MIGRATION_ITEM_DETAILS_MOCK: DeploymentItemDetails = {
  ...MIGRATION_MOCK,
  tasks: [{ ...TASK_MOCK, task_type: "migration_task" }],
};

export const DEPLOYMENT_ITEM_DETAILS_MOCK: DeploymentItemDetails = {
  ...DEPLOYMENT_MOCK,
  tasks: [{ ...TASK_MOCK, task_type: "deployment_task" }],
};
