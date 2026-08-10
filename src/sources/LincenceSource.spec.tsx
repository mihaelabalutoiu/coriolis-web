/*
Copyright (C) 2026  Cloudbase Solutions SRL
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

import Api from "@src/utils/ApiCaller";

import licenceSource from "./LincenceSource";

jest.mock("@src/utils/ApiCaller", () => ({
  __esModule: true,
  default: { send: jest.fn() },
}));

jest.mock("@src/utils/Config", () => ({
  __esModule: true,
  default: {
    config: { servicesUrls: { coriolisLicensing: "https://licensing" } },
  },
}));

const send = Api.send as jest.Mock;

const STANDARD_STATS_BODY = {
  current_performed_migrations: 1,
  current_performed_replicas: 2,
  lifetime_performed_migrations: 3,
  lifetime_performed_replicas: 4,
  current_available_migrations: 5,
  current_available_replicas: 6,
  lifetime_available_migrations: 7,
  lifetime_available_replicas: 8,
};

const SAP_STATS_BODY = {
  current_performed_migrations: 11,
  current_performed_replicas: 12,
  lifetime_performed_migrations: 13,
  lifetime_performed_replicas: 14,
  current_available_migrations: 15,
  current_available_replicas: 16,
  lifetime_available_migrations: 17,
  lifetime_available_replicas: 18,
};

const EXPECTED_STANDARD_STATS = {
  currentPerformedMigrations: 1,
  currentPerformedReplicas: 2,
  lifetimePerformedMigrations: 3,
  lifetimePerformedReplicas: 4,
  currentAvailableMigrations: 5,
  currentAvailableReplicas: 6,
  lifetimeAvailableMigrations: 7,
  lifetimeAvailableReplicas: 8,
};

const EXPECTED_SAP_STATS = {
  currentPerformedMigrations: 11,
  currentPerformedReplicas: 12,
  lifetimePerformedMigrations: 13,
  lifetimePerformedReplicas: 14,
  currentAvailableMigrations: 15,
  currentAvailableReplicas: 16,
  lifetimeAvailableMigrations: 17,
  lifetimeAvailableReplicas: 18,
};

const EMPTY_STATS = {
  currentPerformedMigrations: 0,
  currentPerformedReplicas: 0,
  lifetimePerformedMigrations: 0,
  lifetimePerformedReplicas: 0,
  currentAvailableMigrations: 0,
  currentAvailableReplicas: 0,
  lifetimeAvailableMigrations: 0,
  lifetimeAvailableReplicas: 0,
};

const respond = (applianceLicenceStatus: any) => {
  send.mockResolvedValue({
    data: { appliance_licence_status: applianceLicenceStatus },
  });
};

describe("LicenceSource.loadLicenceInfo", () => {
  it("reads the per-edition stats bodies of the current status format", async () => {
    respond({
      appliance_id: "appliance-1",
      earliest_licence_expiry_time: "2026-04-18T13:13:35Z",
      latest_licence_expiry_time: "2026-05-19T12:40:21Z",
      standard_licence_stats: STANDARD_STATS_BODY,
      sap_licence_stats: SAP_STATS_BODY,
    });

    const licence = await licenceSource.loadLicenceInfo("appliance-1");

    expect(licence.applianceId).toBe("appliance-1");
    expect(licence.earliestLicenceExpiryDate).toEqual(
      new Date("2026-04-18T13:13:35Z"),
    );
    expect(licence.latestLicenceExpiryDate).toEqual(
      new Date("2026-05-19T12:40:21Z"),
    );
    expect(licence.standardStats).toEqual(EXPECTED_STANDARD_STATS);
    expect(licence.sapStats).toEqual(EXPECTED_SAP_STATS);
  });

  it("zeroes the SAP stats when the appliance holds no SAP licence", async () => {
    respond({
      appliance_id: "appliance-1",
      standard_licence_stats: STANDARD_STATS_BODY,
      sap_licence_stats: {
        current_performed_migrations: 0,
        current_performed_replicas: 0,
        lifetime_performed_migrations: 0,
        lifetime_performed_replicas: 0,
        current_available_migrations: 0,
        current_available_replicas: 0,
        lifetime_available_migrations: 0,
        lifetime_available_replicas: 0,
      },
    });

    const licence = await licenceSource.loadLicenceInfo("appliance-1");

    expect(licence.standardStats).toEqual(EXPECTED_STANDARD_STATS);
    expect(licence.sapStats).toEqual(EMPTY_STATS);
  });

  it("reads the flat counters of a licensing server which predates SAP", async () => {
    respond({
      appliance_id: "appliance-1",
      earliest_licence_expiry_time: "2026-04-18T13:13:35Z",
      latest_licence_expiry_time: "2026-05-19T12:40:21Z",
      ...STANDARD_STATS_BODY,
    });

    const licence = await licenceSource.loadLicenceInfo("appliance-1");

    expect(licence.standardStats).toEqual(EXPECTED_STANDARD_STATS);
    expect(licence.sapStats).toEqual(EMPTY_STATS);
  });

  it("throws when the licensing server returns no status body", async () => {
    respond(undefined);

    await expect(licenceSource.loadLicenceInfo("appliance-1")).rejects.toThrow(
      "appliance_licence_status",
    );
  });
});

describe("LicenceSource.loadLicenceServerStatus", () => {
  it("sorts the supported licence versions newest first", async () => {
    send.mockResolvedValue({
      data: {
        status: {
          hostname: "licensing-host",
          multi_appliance: false,
          supported_licence_versions: ["v1", "v2", "v2-sap"],
          server_local_time: "2026-04-18T13:13:35Z",
        },
      },
    });

    const status = await licenceSource.loadLicenceServerStatus();

    expect(status.supported_licence_versions).toEqual(["v2-sap", "v2", "v1"]);
  });
});
