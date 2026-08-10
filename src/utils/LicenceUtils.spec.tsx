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

import LicenceUtils from "./LicenceUtils";

import type {
  Licence,
  LicenceServerStatus,
  LicenceStats,
} from "@src/@types/Licence";

const stats = (over: Partial<LicenceStats> = {}): LicenceStats => ({
  ...LicenceUtils.emptyStats(),
  ...over,
});

const licence = (over: Partial<Licence> = {}): Licence => ({
  applianceId: "test-id",
  earliestLicenceExpiryDate: new Date(),
  latestLicenceExpiryDate: new Date(),
  standardStats: LicenceUtils.emptyStats(),
  sapStats: LicenceUtils.emptyStats(),
  ...over,
});

const serverStatus = (versions: string[]): LicenceServerStatus => ({
  hostname: "test-hostname",
  multi_appliance: false,
  supported_licence_versions: versions,
  server_local_time: new Date().toISOString(),
});

describe("LicenceUtils", () => {
  describe("getActiveKinds", () => {
    it("falls back to standard for an appliance with no licence at all", () => {
      expect(LicenceUtils.getActiveKinds(licence())).toEqual(["standard"]);
    });

    it("returns only standard for a standard-only appliance", () => {
      expect(
        LicenceUtils.getActiveKinds(
          licence({ standardStats: stats({ currentAvailableReplicas: 5 }) }),
        ),
      ).toEqual(["standard"]);
    });

    it("returns only sap for an SAP-only appliance", () => {
      expect(
        LicenceUtils.getActiveKinds(
          licence({ sapStats: stats({ currentAvailableMigrations: 3 }) }),
        ),
      ).toEqual(["sap"]);
    });

    it("returns both editions, standard first, when both are licenced", () => {
      expect(
        LicenceUtils.getActiveKinds(
          licence({
            standardStats: stats({ lifetimeAvailableReplicas: 5 }),
            sapStats: stats({ lifetimeAvailableMigrations: 3 }),
          }),
        ),
      ).toEqual(["standard", "sap"]);
    });

    it("ignores usage counters with no allowance behind them", () => {
      expect(
        LicenceUtils.getActiveKinds(
          licence({ sapStats: stats({ lifetimePerformedReplicas: 4 }) }),
        ),
      ).toEqual(["standard"]);
    });
  });

  describe("getApplianceIdWithVersion", () => {
    it("uses the newest non-SAP version the server supports", () => {
      expect(
        LicenceUtils.getApplianceIdWithVersion(
          "test-id",
          serverStatus(["v2-sap", "v2", "v1"]),
        ),
      ).toBe("test-id-licencev2");
    });

    it("keeps working against a server which knows nothing of SAP", () => {
      expect(
        LicenceUtils.getApplianceIdWithVersion(
          "test-id",
          serverStatus(["v2", "v1"]),
        ),
      ).toBe("test-id-licencev2");
    });

    it("defaults to v2 when the server reports no supported versions", () => {
      expect(
        LicenceUtils.getApplianceIdWithVersion("test-id", serverStatus([])),
      ).toBe("test-id-licencev2");
    });
  });

  describe("getStats", () => {
    it("returns the stats body of the requested edition", () => {
      const info = licence({
        standardStats: stats({ currentAvailableReplicas: 5 }),
        sapStats: stats({ currentAvailableReplicas: 3 }),
      });
      expect(
        LicenceUtils.getStats(info, "standard").currentAvailableReplicas,
      ).toBe(5);
      expect(LicenceUtils.getStats(info, "sap").currentAvailableReplicas).toBe(
        3,
      );
    });
  });
});
