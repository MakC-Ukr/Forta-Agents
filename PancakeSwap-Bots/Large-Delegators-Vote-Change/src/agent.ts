import {
  BlockEvent,
  Finding,
  HandleBlock,
  HandleTransaction,
  TransactionEvent,
  FindingSeverity,
  FindingType,
} from "forta-agent";

export const DELEGATE_VOTES_CHANGED_EVENT = 
"event DelegateVotesChanged(address indexed delegate, uint previousBalance, uint newBalance)";
export const CAKE_ADDRESS = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82";

const HIGH_THRESHOLD = 100
const MEDIUM_THRESHOLD = 50
const LOW_THRESHOLD = 25

let findingsCount = 0;

const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent
) => {
  const findings: Finding[] = [];

  // limiting this agent to emit only 5 findings so that the alert feed is not spammed
  if (findingsCount >= 5) return findings;

  // filter the transaction logs for Tether transfer events
  const delegateVotesChangedEvents = txEvent.filterLog(
    DELEGATE_VOTES_CHANGED_EVENT,
    CAKE_ADDRESS
  );

  delegateVotesChangedEvents.forEach((delegateVotesChangedEvent) => {
    // extract transfer event arguments
    const { delegate, previousBalance, newBalance } = delegateVotesChangedEvent.args;
    
    let delta = newBalance - previousBalance

    // if more than 10,000 Tether were transferred, report it
    if (delta >= LOW_THRESHOLD) {
      findings.push(
        Finding.fromObject({
          name: "High Tether Transfer",
          description: `High amount of USDT transferred: ${}`,
          alertId: "FORTA-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            delegate,
            previousBalance,
            newBalance
          },
        })
      );
      findingsCount++;
    }
  });

  return findings;
};

// const handleBlock: HandleBlock = async (blockEvent: BlockEvent) => {
//   const findings: Finding[] = [];
//   // detect some block condition
//   return findings;
// }

export default {
  handleTransaction,
  // handleBlock
};
