import React, { useState } from "react";
import axios from "axios";
import {
  ChevronDown,
  ChevronRight,
  User,
  Shield,
  CheckCircle,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { OfacChecker } from "../utils/ofacChecker";
import { BlacklistChecker } from "../utils/blacklistChecker";
import { transliterate } from "../utils/translit";

const EntitySearch: React.FC = () => {
  const [orgInfoSearch, setOrgInfoSearch] = useState("");
  const [orgInfoResult, setOrgInfoResult] = useState<any>(null);
  const [egrulSearch, setEgrulSearch] = useState("");
  const [egrulResult, setEgrulResult] = useState<any>(null);
  const [expandedNodes, setExpandedNodes] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [loadingOrgInfo, setLoadingOrgInfo] = useState(false);
  const [loadingEgrul, setLoadingEgrul] = useState(false);
  const [complianceResults, setComplianceResults] = useState<
    Record<string, { ofacMatch: boolean; blacklistMatch: boolean }>
  >({});

  const checkCompliance = async (data: any) => {
    const results: Record<string, { ofacMatch: boolean; blacklistMatch: boolean }> =
      {};

    const checkEntity = async (name: string) => {
      const transliteratedName = transliterate(name);
      const ofacResult = await OfacChecker.checkName(transliteratedName);
      const blacklistResult = BlacklistChecker.checkName(transliteratedName, []);

      results[transliteratedName] = {
        ofacMatch: ofacResult.isMatch,
        blacklistMatch: !!blacklistResult,
      };
    };

    if (data.name) await checkEntity(data.name); // Company name
    if (data.CEO) await checkEntity(data.CEO); // CEO
    if (data.Founders) {
      for (const founder of data.Founders) {
        await checkEntity(founder.owner); // Founder
        if (founder.isCompany && founder.companyDetails) {
          await checkCompliance(founder.companyDetails); // Recursive check for nested companies
        }
      }
    }

    setComplianceResults((prev) => ({ ...prev, ...results }));
  };

  const handleOrgInfoSearch = async () => {
    setLoadingOrgInfo(true);
    try {
      const response = await axios.get(
        `http://localhost:3001/api/search-orginfo?company_name=${orgInfoSearch}`
      );
      setOrgInfoResult(response.data);
      await checkCompliance(response.data);
    } catch (error) {
      console.error("Error fetching OrgInfo data:", error);
      setOrgInfoResult({ error: "Failed to fetch OrgInfo data." });
    } finally {
      setLoadingOrgInfo(false);
    }
  };

  const handleEgrulSearch = async () => {
    setLoadingEgrul(true);
    try {
      const response = await axios.get(
        `http://localhost:3001/api/search-egrul?inn=${egrulSearch}`
      );
      setEgrulResult(response.data);
      await checkCompliance(response.data);
    } catch (error) {
      console.error("Error fetching EGRUL data:", error);
      setEgrulResult({ error: "Failed to fetch EGRUL data." });
    } finally {
      setLoadingEgrul(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const renderComplianceIcon = (key: string) => {
    const result = complianceResults[key];
    if (!result) return null;

    if (result.blacklistMatch) {
      return (
        <span title="Blacklisted">
          <Shield className="w-4 h-4 text-red-500" />
        </span>
      );
    } else if (result.ofacMatch) {
      return (
        <span title="OFAC Match">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        </span>
      );
    } else {
      return (
        <span title="Clear">
          <CheckCircle className="w-4 h-4 text-green-500" />
        </span>
      );
    }
  };

  const renderOwnershipTree = (owners: any[], parentId = "") => (
    <ul className="space-y-1 ml-4 mt-1">
      {owners.map((owner, index) => {
        const nodeId = `${parentId}_${index}`;
        const isExpanded = expandedNodes[nodeId];
        const hasCompanyDetails = owner.isCompany && owner.companyDetails;

        return (
          <li key={nodeId} className="flex flex-col space-y-1">
            <div className="flex items-center">
              {hasCompanyDetails && (
                <button onClick={() => toggleNode(nodeId)}>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {owner.isCompany ? (
                <Building2 className="w-4 h-4 text-gray-400" />
              ) : (
                <User className="w-4 h-4 text-gray-400" />
              )}
              <span className="ml-2">{transliterate(owner.owner)}</span>
              {renderComplianceIcon(transliterate(owner.owner))}
            </div>
            {isExpanded && owner.companyDetails && (
              <div className="ml-4">
                <div className="flex items-center space-x-1">
                  <span>CEO: {transliterate(owner.companyDetails.CEO)}</span>
                  {renderComplianceIcon(transliterate(owner.companyDetails.CEO))}
                </div>
                {owner.companyDetails.inn && (
                  <div className="flex items-center space-x-1">
                    <span>INN: {owner.companyDetails.inn}</span>
                  </div>
                )}
                {renderOwnershipTree(owner.companyDetails.Founders, nodeId)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        Entity Search
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OrgInfo Section */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
            Search OrgInfo
          </h3>
          <input
            type="text"
            placeholder="Enter company name"
            value={orgInfoSearch}
            onChange={(e) => setOrgInfoSearch(e.target.value)}
            className="w-full px-3 py-2 mb-4 border rounded-md dark:bg-gray-600 dark:text-gray-100"
          />
          <button
            onClick={handleOrgInfoSearch}
            className="bg-[#008766] text-white px-4 py-2 rounded-md hover:bg-[#007055]"
            disabled={loadingOrgInfo}
          >
            {loadingOrgInfo ? "Searching..." : "Search OrgInfo"}
          </button>
          {orgInfoResult && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                Results:
              </h4>
              {orgInfoResult.error ? (
                <p className="text-red-500">{orgInfoResult.error}</p>
              ) : (
                <div className="mt-4 bg-gray-200 dark:bg-gray-900 p-4 rounded-md">
                  <p>
                    <strong>Company Name:</strong> {transliterate(orgInfoResult.name)}{" "}
                    {renderComplianceIcon(transliterate(orgInfoResult.name))}
                  </p>
                  <p>
                    <strong>CEO:</strong> {transliterate(orgInfoResult.CEO)}{" "}
                    {renderComplianceIcon(transliterate(orgInfoResult.CEO))}
                  </p>
                  <p>
                    <strong>Address:</strong> {orgInfoResult.address}
                  </p>
                  {orgInfoResult.Founders && (
                    <div className="mt-4">
                      <strong>Founders:</strong>
                      {renderOwnershipTree(orgInfoResult.Founders)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* EGRUL Section */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
            Search EGRUL
          </h3>
          <input
            type="text"
            placeholder="Enter INN"
            value={egrulSearch}
            onChange={(e) => setEgrulSearch(e.target.value)}
            className="w-full px-3 py-2 mb-4 border rounded-md dark:bg-gray-600 dark:text-gray-100"
          />
          <button
            onClick={handleEgrulSearch}
            className="bg-[#008766] text-white px-4 py-2 rounded-md hover:bg-[#007055]"
            disabled={loadingEgrul}
          >
            {loadingEgrul ? "Searching..." : "Search EGRUL"}
          </button>
          {egrulResult && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                Results:
              </h4>
              {egrulResult.error ? (
                <p className="text-red-500">{egrulResult.error}</p>
              ) : (
                <div className="mt-4 bg-gray-200 dark:bg-gray-900 p-4 rounded-md">
                  <p>
                    <strong>Company Name:</strong> {transliterate(egrulResult.name)}{" "}
                    {renderComplianceIcon(transliterate(egrulResult.name))}
                  </p>
                  <p>
                    <strong>CEO:</strong> {transliterate(egrulResult.CEO)}{" "}
                    {renderComplianceIcon(transliterate(egrulResult.CEO))}
                  </p>
                  <p>
                    <strong>Address:</strong> {egrulResult.address}
                  </p>
                  {egrulResult.Founders && (
                    <div className="mt-4">
                      <strong>Founders:</strong>
                      {renderOwnershipTree(egrulResult.Founders)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntitySearch;
