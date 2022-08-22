import { Finding, ethers, FindingSeverity, FindingType, HandleTransaction, TransactionEvent } from "forta-agent";
import { createAddress, TestTransactionEvent } from "forta-agent-tools/lib/tests";
import { provideTransactionHandler } from "./agent";
import NetworkData from "./network";
import { INCREASE_POSITION_EVENT, UPDATE_POSITION_EVENT } from "./constants";
import { ethersBnToBn } from "./utils";

const TEST_PRICE_PRECISION = 30;
const MOCK_OTHER_EVENT: string = "event UpdateFundingRate(address token, uint256 fundingRate)";
const MOCK_EVENT_ABI: string[] = [INCREASE_POSITION_EVENT, UPDATE_POSITION_EVENT];
const MOCK_TOKEN: string = createAddress("0x85e");
const MOCK_ACCOUNT: string = createAddress("0x11a");
const MOCK_OTHER_CONTRACT: string = createAddress("0x99");
const MOCK_VAULT_ADDRESS: string = createAddress("0xa1");
const MOCK_IFACE: ethers.utils.Interface = new ethers.utils.Interface(MOCK_EVENT_ABI);
const key: string = ethers.utils.formatBytes32String("positionKey");

const smallSize = ethers.BigNumber.from(1000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION));
const size1 = ethers.BigNumber.from(500000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));
const size2 = ethers.BigNumber.from(600000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));
const size3 = ethers.BigNumber.from(700000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));
const size4 = ethers.BigNumber.from(8000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));
const size5 = ethers.BigNumber.from(90000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));
const size6 = ethers.BigNumber.from(90000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));

const sizeDelta1 = ethers.BigNumber.from(50000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));
const sizeDelta2 = ethers.BigNumber.from(60000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));
const sizeDelta3 = ethers.BigNumber.from(70000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));
const sizeDelta4 = ethers.BigNumber.from(8000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));
const sizeDelta5 = ethers.BigNumber.from(90000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));
const sizeDelta6 = ethers.BigNumber.from(90000000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));

const mockCreateFinding = (
  account: string,
  vaultAddress: string,
  updateKey: string,
  increaseKey: string,
  size: ethers.BigNumber,
  sizeDelta: ethers.BigNumber
): Finding => {
  if (size.eq(sizeDelta)) {
    return Finding.fromObject({
      name: "Large position size opened on GMX's Vault Contract",
      description: "UpdatePosition event emitted with a large position size",
      alertId: "GMX-1-1",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      protocol: "GMX",
      metadata: {
        gmxVault: vaultAddress,
        account: account,
        positionSize: ethersBnToBn(size, 30).decimalPlaces(2).toString(),
        positionKey: updateKey,
      },
    });
  } else
    return Finding.fromObject({
      name: "Large increase in an existing position on GMX's Vault Contract",
      description: "IncreasePosition event emitted with large increase in an existing position on GMX's Vault Contract",
      alertId: "GMX-1-2",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      protocol: "GMX",
      metadata: {
        gmxVault: vaultAddress,
        account: account,
        positionSize: ethersBnToBn(size, 30).decimalPlaces(2).toString(10),
        positionIncrementSize: ethersBnToBn(sizeDelta, 30).decimalPlaces(2).toString(10),
        positionKey: increaseKey,
      },
    });
};

describe("Large Open/Increase Position Test Suite", () => {
  let handleTransaction: HandleTransaction;
  let txEvent: TransactionEvent;
  let findings: Finding[];
  const increasePositionEventFragment: ethers.utils.EventFragment = MOCK_IFACE.getEvent("IncreasePosition");
  const updatePositionEventFragment: ethers.utils.EventFragment = MOCK_IFACE.getEvent("UpdatePosition");

  const mockNetworkManager: NetworkData = {
    vaultAddress: MOCK_VAULT_ADDRESS,
    networkMap: {},
    setNetwork: jest.fn(),
    threshold: "5000",
  };

  beforeAll(() => {
    handleTransaction = provideTransactionHandler(mockNetworkManager);
  });

  it("should return no finding in empty transaction", async () => {
    txEvent = new TestTransactionEvent();

    findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([]);
  });

  it("should ignore other emitted events from Vault Contract", async () => {
    const unsupportedIFACE = new ethers.utils.Interface([MOCK_OTHER_EVENT]);
    const unsupportedEventLog = MOCK_IFACE.encodeEventLog(unsupportedIFACE.getEvent("UpdateFundingRate"), [
      createAddress("0x0009"),
      0,
    ]);
    txEvent = new TestTransactionEvent().addAnonymousEventLog(
      mockNetworkManager.vaultAddress,
      unsupportedEventLog.data,
      ...unsupportedEventLog.topics
    );

    findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([]);
  });

  it("should ignore IncreasePosition emitted from a different contract", async () => {
    const increasePositionEventLog = MOCK_IFACE.encodeEventLog(increasePositionEventFragment, [
      key,
      MOCK_ACCOUNT,
      MOCK_TOKEN,
      MOCK_TOKEN,
      0,
      sizeDelta1,
      true,
      0,
      0,
    ]);

    txEvent = new TestTransactionEvent()
      .setTo(MOCK_OTHER_CONTRACT)
      .addAnonymousEventLog(MOCK_OTHER_CONTRACT, increasePositionEventLog.data, ...increasePositionEventLog.topics);

    findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([]);
  });

  it("should ignore UpdatePosition emitted from a different contract", async () => {
    const updatePositionEventLog = MOCK_IFACE.encodeEventLog(updatePositionEventFragment, [key, size1, 0, 0, 0, 0, 0]);

    txEvent = new TestTransactionEvent()
      .setTo(MOCK_OTHER_CONTRACT)
      .addAnonymousEventLog(MOCK_OTHER_CONTRACT, updatePositionEventLog.data, ...updatePositionEventLog.topics);

    findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([]);
  });

  it("should ignore event emissions with different increasePosition and updatePosition keys", async () => {
    const updatePositionEventLog = MOCK_IFACE.encodeEventLog(updatePositionEventFragment, [
      ethers.utils.formatBytes32String("updateKey"),
      size1,
      0,
      0,
      0,
      0,
      0,
    ]);

    const increasePositionEventLog = MOCK_IFACE.encodeEventLog(increasePositionEventFragment, [
      ethers.utils.formatBytes32String("increaseKey"),
      MOCK_ACCOUNT,
      MOCK_TOKEN,
      MOCK_TOKEN,
      0,
      size1,
      true,
      0,
      0,
    ]);

    txEvent = new TestTransactionEvent()

      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        increasePositionEventLog.data,
        ...increasePositionEventLog.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        updatePositionEventLog.data,
        ...updatePositionEventLog.topics
      );

    findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([]);
  });

  it("should ignore event emissions whose position size is not large", async () => {
    const increasePositionEventLog = MOCK_IFACE.encodeEventLog(increasePositionEventFragment, [
      key,
      MOCK_ACCOUNT,
      MOCK_TOKEN,
      MOCK_TOKEN,
      0,
      smallSize,
      true,
      0,
      0,
    ]);

    const updatePositionEventLog = MOCK_IFACE.encodeEventLog(updatePositionEventFragment, [
      key,
      smallSize,
      0,
      0,
      0,
      0,
      0,
    ]);

    txEvent = new TestTransactionEvent()
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        increasePositionEventLog.data,
        ...increasePositionEventLog.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        updatePositionEventLog.data,
        ...updatePositionEventLog.topics
      );

    findings = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([]);
  });

  it("should return a finding for large increase in an existing position", async () => {
    const positionSize = ethers.BigNumber.from(600000).mul(ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3));
    const positionSizeDelta = ethers.BigNumber.from(5000000000).mul(
      ethers.BigNumber.from(10).pow(TEST_PRICE_PRECISION - 3)
    );
    const increasePositionEventLog = MOCK_IFACE.encodeEventLog(increasePositionEventFragment, [
      key,
      MOCK_ACCOUNT,
      MOCK_TOKEN,
      MOCK_TOKEN,
      0,
      positionSizeDelta,
      true,
      0,
      0,
    ]);

    const updatePositionEventLog = MOCK_IFACE.encodeEventLog(updatePositionEventFragment, [
      key,
      positionSize,
      0,
      0,
      0,
      0,
      0,
    ]);

    txEvent = new TestTransactionEvent()
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        increasePositionEventLog.data,
        ...increasePositionEventLog.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        updatePositionEventLog.data,
        ...updatePositionEventLog.topics
      );

    findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([
      mockCreateFinding(MOCK_ACCOUNT, mockNetworkManager.vaultAddress, key, key, positionSize, positionSizeDelta),
    ]);
  });

  it("should return a finding when a large position is opened", async () => {
    const increasePositionEventLog = MOCK_IFACE.encodeEventLog(increasePositionEventFragment, [
      key,
      MOCK_ACCOUNT,
      MOCK_TOKEN,
      MOCK_TOKEN,
      0,
      sizeDelta4,
      true,
      0,
      0,
    ]);

    const updatePositionEventLog = MOCK_IFACE.encodeEventLog(updatePositionEventFragment, [
      key,
      sizeDelta4,
      0,
      0,
      0,
      0,
      0,
    ]);

    txEvent = new TestTransactionEvent()

      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        increasePositionEventLog.data,
        ...increasePositionEventLog.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        updatePositionEventLog.data,
        ...updatePositionEventLog.topics
      );
    findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([
      mockCreateFinding(MOCK_ACCOUNT, mockNetworkManager.vaultAddress, key, key, size4, sizeDelta4),
    ]);
  });

  it("should detect multiple findings for both IncreasePosition event emitted with a large increase in an existing position and UpdatePosition event emitted when a large position is opened", async () => {
    const increasePositionEventLog1 = MOCK_IFACE.encodeEventLog(increasePositionEventFragment, [
      key,
      MOCK_ACCOUNT,
      MOCK_TOKEN,
      MOCK_TOKEN,
      0,
      sizeDelta1,
      true,
      0,
      0,
    ]);

    const updatePositionEventLog1 = MOCK_IFACE.encodeEventLog(updatePositionEventFragment, [key, size1, 0, 0, 0, 0, 0]);

    const increasePositionEventLog2 = MOCK_IFACE.encodeEventLog(increasePositionEventFragment, [
      key,
      MOCK_ACCOUNT,
      MOCK_TOKEN,
      MOCK_TOKEN,
      0,
      sizeDelta2,
      true,
      0,
      0,
    ]);

    const updatePositionEventLog2 = MOCK_IFACE.encodeEventLog(updatePositionEventFragment, [key, size2, 0, 0, 0, 0, 0]);

    const increasePositionEventLog3 = MOCK_IFACE.encodeEventLog(increasePositionEventFragment, [
      key,
      MOCK_ACCOUNT,
      MOCK_TOKEN,
      MOCK_TOKEN,
      0,
      sizeDelta3,
      true,
      0,
      0,
    ]);

    const updatePositionEventLog3 = MOCK_IFACE.encodeEventLog(updatePositionEventFragment, [key, size3, 0, 0, 0, 0, 0]);

    const increasePositionEventLog4 = MOCK_IFACE.encodeEventLog(increasePositionEventFragment, [
      key,
      MOCK_ACCOUNT,
      MOCK_TOKEN,
      MOCK_TOKEN,
      0,
      sizeDelta4,
      true,
      0,
      0,
    ]);

    const updatePositionEventLog4 = MOCK_IFACE.encodeEventLog(updatePositionEventFragment, [key, size4, 0, 0, 0, 0, 0]);

    const increasePositionEventLog5 = MOCK_IFACE.encodeEventLog(increasePositionEventFragment, [
      key,
      MOCK_ACCOUNT,
      MOCK_TOKEN,
      MOCK_TOKEN,
      0,
      sizeDelta5,
      true,
      0,
      0,
    ]);

    const updatePositionEventLog5 = MOCK_IFACE.encodeEventLog(updatePositionEventFragment, [key, size6, 0, 0, 0, 0, 0]);

    const increasePositionEventLog6 = MOCK_IFACE.encodeEventLog(increasePositionEventFragment, [
      key,
      MOCK_ACCOUNT,
      MOCK_TOKEN,
      MOCK_TOKEN,
      0,
      sizeDelta6,
      true,
      0,
      0,
    ]);

    const updatePositionEventLog6 = MOCK_IFACE.encodeEventLog(updatePositionEventFragment, [key, size5, 0, 0, 0, 0, 0]);

    txEvent = new TestTransactionEvent()
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        increasePositionEventLog1.data,
        ...increasePositionEventLog1.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        updatePositionEventLog1.data,
        ...updatePositionEventLog1.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        increasePositionEventLog2.data,
        ...increasePositionEventLog2.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        updatePositionEventLog2.data,
        ...updatePositionEventLog2.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        increasePositionEventLog3.data,
        ...increasePositionEventLog3.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        updatePositionEventLog3.data,
        ...updatePositionEventLog3.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        increasePositionEventLog4.data,
        ...increasePositionEventLog4.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        updatePositionEventLog4.data,
        ...updatePositionEventLog4.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        increasePositionEventLog5.data,
        ...increasePositionEventLog5.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        updatePositionEventLog5.data,
        ...updatePositionEventLog5.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        increasePositionEventLog6.data,
        ...increasePositionEventLog6.topics
      )
      .addAnonymousEventLog(
        mockNetworkManager.vaultAddress,
        updatePositionEventLog6.data,
        ...updatePositionEventLog6.topics
      );

    findings = await handleTransaction(txEvent);

    // multiple findings for increasePosition and updatePosition event
    expect(findings).toStrictEqual([
      mockCreateFinding(MOCK_ACCOUNT, mockNetworkManager.vaultAddress, key, key, size1, sizeDelta1),
      mockCreateFinding(MOCK_ACCOUNT, mockNetworkManager.vaultAddress, key, key, size2, sizeDelta2),
      mockCreateFinding(MOCK_ACCOUNT, mockNetworkManager.vaultAddress, key, key, size3, sizeDelta3),
      mockCreateFinding(MOCK_ACCOUNT, mockNetworkManager.vaultAddress, key, key, size4, sizeDelta4),
      mockCreateFinding(MOCK_ACCOUNT, mockNetworkManager.vaultAddress, key, key, size5, sizeDelta5),
      mockCreateFinding(MOCK_ACCOUNT, mockNetworkManager.vaultAddress, key, key, size6, sizeDelta6),
    ]);
  });
});
