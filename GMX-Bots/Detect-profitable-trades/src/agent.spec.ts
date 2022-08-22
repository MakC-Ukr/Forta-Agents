import { FindingType, FindingSeverity, Finding, ethers, HandleTransaction, TransactionEvent } from "forta-agent";
import { TestTransactionEvent } from "forta-agent-tools/lib/tests";
import { provideHandleTx } from "./agent";
import { createAddress } from "forta-agent-tools/lib/tests";
import { Interface } from "@ethersproject/abi";

const ABI: string =
  "event Swap(address account, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 amountOutAfterFees, uint256 feeBasisPoints)";
const TEST_IFACE: Interface = new Interface([ABI]);

const MOCK_GMX_ROUTER_ADDRESS = createAddress("0x1");
const MOCK_NETWORK_MANAGER = {
  get: jest.fn().mockReturnValue(MOCK_GMX_ROUTER_ADDRESS),
};

let mockPriceFeed = {
  get: jest.fn().mockReturnValue({
    latestRoundData: jest.fn().mockReturnValue({
      roundId: 0,
      answer: 1,
      startedAt: 2,
      updatedAt: 3,
      answeredInRound: 4,
    }),
  }),
};

describe("Unusual amount of profitable account detection bot test suite", () => {
  let handler: HandleTransaction;
  const tradeHistory = new Map<string, [number, number, number]>([]);

  const eventGain = TEST_IFACE.getEvent("Swap");
  const logGain = TEST_IFACE.encodeEventLog(eventGain, [
    createAddress("0xf0"),
    createAddress("0x2"), //USDC
    createAddress("0x3"), //WBTC
    1,
    1,
    1,
    1,
  ]);

  beforeEach(() => {
    tradeHistory.clear();

    handler = provideHandleTx(
      MOCK_NETWORK_MANAGER,
      ABI,
      mockPriceFeed as unknown as Map<string, ethers.Contract>,
      tradeHistory
    );
  });

  it("returns empty findings if there are no swap events to a non-vault address", async () => {
    const transaction: TransactionEvent = new TestTransactionEvent()
      .setFrom(createAddress("0x0f"))
      .setTo(createAddress("0x0f"));
    const findings = await handler(transaction);

    expect(findings).toStrictEqual([]);
  });

  it("returns empty findings if there are no swap events to the vault address", async () => {
    const transaction: TransactionEvent = new TestTransactionEvent()
      .setFrom(createAddress("0x0f"))
      .setTo(MOCK_GMX_ROUTER_ADDRESS);
    const findings = await handler(transaction);

    expect(findings).toStrictEqual([]);
  });

  it("returns empty findings if there are swap events to a non-vault address", async () => {
    const transaction1: TransactionEvent = new TestTransactionEvent()
      .setFrom(createAddress("0xf0"))
      .setTo(createAddress("0x0f"))
      .setBlock(1)
      .addEventLog(eventGain.format("sighash"), createAddress("0x0"), logGain.data, ...logGain.topics.slice(1));
    const findings = await handler(transaction1);

    expect(findings).toStrictEqual([]);
  });

  it("returns empty findings if there is an account with a suspicious amount of profitable trades but not above the grace period", async () => {
    const transaction: TransactionEvent = new TestTransactionEvent()
      .setFrom(createAddress("0xf0"))
      .setTo(MOCK_GMX_ROUTER_ADDRESS)
      .setBlock(1)
      .addEventLog(eventGain.format("sighash"), createAddress("0x0"), logGain.data, ...logGain.topics.slice(1));

    mockPriceFeed
      .get()
      .latestRoundData.mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      });
    let findings = await handler(transaction);
    expect(findings).toStrictEqual([]);

    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);

    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);
  });

  it("returns empty findings if there is an account with a amount of trades larger than the grace period but not enough are profitable to be suspicious", async () => {
    const transaction: TransactionEvent = new TestTransactionEvent()
      .setFrom(createAddress("0xf0"))
      .setTo(MOCK_GMX_ROUTER_ADDRESS)
      .setBlock(1)
      .addEventLog(eventGain.format("sighash"), createAddress("0x0"), logGain.data, ...logGain.topics.slice(1));

    mockPriceFeed
      .get()
      .latestRoundData.mockReturnValueOnce({
        roundId: 0,
        answer: 2100000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      });
    let findings = await handler(transaction);
    expect(findings).toStrictEqual([]);
    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);
    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);
  });

  it("returns findings if there is an account with a suspicious amount of profitable trades", async () => {
    const transaction: TransactionEvent = new TestTransactionEvent()
      .setFrom(createAddress("0xf0"))
      .setTo(MOCK_GMX_ROUTER_ADDRESS)
      .setBlock(1)
      .addEventLog(eventGain.format("sighash"), createAddress("0x0"), logGain.data, ...logGain.topics.slice(1));

    mockPriceFeed
      .get()
      .latestRoundData.mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 100000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      });
    let findings = await handler(transaction);
    expect(findings).toStrictEqual([]);

    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);

    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);

    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);

    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);

    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);

    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);

    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);

    findings = await handler(transaction);
    expect(findings).toStrictEqual([]);

    findings = await handler(transaction);

    expect(findings).toStrictEqual([
      Finding.fromObject({
        name: "Unusual amount of profitable trades",
        description: `User ${createAddress("0xf0").toLowerCase()} has a ${(9 / 10) * 100}% profitable trade ratio`,
        alertId: "GMX-07",
        protocol: "GMX",
        severity: FindingSeverity.Medium,
        type: FindingType.Suspicious,
        metadata: {
          account: createAddress("0xf0").toLowerCase(),
          profitableTrades: "9",
          totalTrades: "10",
          totalProfit: "159992", //in USD
        },
      }),
    ]);
  });

  it("returns empty findings if the amount of profitable trades is no longer suspicious", async () => {
    const transaction: TransactionEvent = new TestTransactionEvent()
      .setFrom(createAddress("0xf0"))
      .setTo(MOCK_GMX_ROUTER_ADDRESS)
      .setBlock(1)
      .addEventLog(eventGain.format("sighash"), createAddress("0x0"), logGain.data, ...logGain.topics.slice(1));

    mockPriceFeed
      .get()
      .latestRoundData.mockReturnValueOnce({
        roundId: 0,
        answer: 2100000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      })
      .mockReturnValueOnce({
        roundId: 0,
        answer: 2000000000000,
        startedAt: 2,
        updatedAt: 3,
        answeredInRound: 4,
      });
    let findings = await handler(transaction);

    expect(findings).toStrictEqual([]);
  });
});
