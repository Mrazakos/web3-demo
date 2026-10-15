const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleStorage", function () {
  let simpleStorage;
  let owner;
  let otherAccount;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();
    const SimpleStorageFactory = await ethers.getContractFactory("SimpleStorage");
    simpleStorage = await SimpleStorageFactory.deploy("Hello, Web3!");
    await simpleStorage.waitForDeployment();
  });

  it("Should return the initial value correctly", async function () {
    expect(await simpleStorage.get()).to.equal("Hello, Web3!");
  });

  it("Should update the value when set() is called", async function () {
    const updateTx = await simpleStorage.set("Updated message on blockchain");
    await updateTx.wait();

    expect(await simpleStorage.get()).to.equal("Updated message on blockchain");
  });

  it("Should emit a ValueUpdated event with caller address and new value", async function () {
    await expect(simpleStorage.connect(otherAccount).set("Message from account 2"))
      .to.emit(simpleStorage, "ValueUpdated")
      .withArgs(otherAccount.address, "Message from account 2");

    expect(await simpleStorage.get()).to.equal("Message from account 2");
  });
});
