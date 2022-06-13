import { ethers, Finding, HandleTransaction, TransactionEvent } from "forta-agent";
import LENDING_POOL_ABI from "./abi";

import CONFIG from "./agent.config";

import utils, { AgentConfig } from "./utils";

export const provideHandleTransaction = (config: AgentConfig): HandleTransaction => {
  const lendingPoolAddress = config.lendingPoolAddress.toLowerCase();
  const lendingPool = new ethers.utils.Interface(LENDING_POOL_ABI);

  return async (txEvent: TransactionEvent): Promise<Finding[]> => {
    const findings: Finding[] = [];
    const { traces } = txEvent;

    for (let i = 0; i < traces.length; i++) {
      const trace = traces[i];
      const depth = trace.traceAddress.length;

      if (trace.action.to === lendingPoolAddress) {
        let alerted = false;

        for (i = i + 1; i < traces.length; i++) {
          if (traces[i].traceAddress.length <= depth) {
            i--;
            break; // subtree ended
          }

          if (!alerted && traces[i].action.to === config.lendingPoolAddress) {
            const selector = (traces[i].action.input || "").slice(0, 10); // "0x" and first 4 bytes
            let func;

            try {
              func = lendingPool.getFunction(selector);
            } catch {
              func = null;
            }

            if (func && config.reentrancyBlacklist.includes(func.name)) {
              let initialFunc;

              try {
                initialFunc = lendingPool.getFunction(trace.action.input.slice(0, 10));
              } catch {
                initialFunc = { name: "(unknown)" };
              }

              if (initialFunc) {
                findings.push(utils.createFinding(initialFunc.name, func.name));
                alerted = true;
              }
            }
          }
        }
      }
    }
    return findings;
  };
};

export default {
  handleTransaction: provideHandleTransaction(CONFIG),
};
