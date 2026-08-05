/*
Copyright (C) 2019  Cloudbase Solutions SRL
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

/**
 * Licence version identifiers as issued by the licensing server.
 * Mirrors `licences.LicenceVersionIdentifier` in coriolis-licensing-server.
 */
export const LICENCE_VERSION_V1 = "v1";
export const LICENCE_VERSION_V2 = "v2";
export const LICENCE_VERSION_V2_SAP = "v2-sap";

/**
 * The two licence flavours the appliance can hold. The licensing server keeps
 * a separate allowance for each, so they are always reported side by side.
 */
export type LicenceKind = "standard" | "sap";

/**
 * Per-flavour licensing counters. Mirrors the `LicenceStats` body of the
 * `appliance_licence_status` response.
 */
export type LicenceStats = {
  currentPerformedMigrations: number;
  currentPerformedReplicas: number;
  lifetimePerformedMigrations: number;
  lifetimePerformedReplicas: number;
  currentAvailableMigrations: number;
  currentAvailableReplicas: number;
  lifetimeAvailableMigrations: number;
  lifetimeAvailableReplicas: number;
};

export type Licence = {
  applianceId: string;
  earliestLicenceExpiryDate: Date;
  latestLicenceExpiryDate: Date;
  /** Allowances issued by standard (`v2`) licences. */
  standardStats: LicenceStats;
  /** Allowances issued by SAP (`v2-sap`) licences. */
  sapStats: LicenceStats;
};

export type LicenceServerStatus = {
  hostname: string;
  multi_appliance: boolean;
  supported_licence_versions: string[];
  server_local_time: string;
};
