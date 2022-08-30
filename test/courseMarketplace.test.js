const CourseMarketplace = artifacts.require("CourseMarketplace");
const { assert, expect } = require("chai");
const { catchRevert } = require("./utils/exceptions");

const getBalance = async (address) => await web3.eth.getBalance(address);
const toBN = (value) => web3.utils.toBN(value);
const getGas = async (result) => {
  const tx = await web3.eth.getTransaction(result.tx);
  const gasUsed = toBN(result.receipt.gasUsed);
  const gasPrice = toBN(tx.gasPrice);
  const gas = gasUsed.mul(gasPrice);
  return gas;
};

contract("CourseMarketplace", (accounts) => {
  const courseId = "0x00000000000000000000000000003130";
  const proof =
    "0x0000000000000000000000000000313000000000000000000000000000003130";
  const courseId2 = "0x00000000000000000000000000002130";
  const proof2 =
    "0x0000000000000000000000000000213000000000000000000000000000002130";
  const value = "9000000000";

  let _contract = null;
  let contractOwner = null;
  let newOwner = null;
  let buyer = null;
  let buyer2 = null;
  let secondBuyer = null;
  let courseHash = null;

  before(async () => {
    _contract = await CourseMarketplace.deployed();
    contractOwner = accounts[0];
    buyer = accounts[1];
    secondBuyer = accounts[3];
    newOwner = accounts[2];
  });

  describe("Purchase new course", () => {
    before(async () => {
      await _contract.purchaseCourse(courseId, proof, {
        from: buyer,
        value,
      });
    });
    it("should not repurchase course similar course", async () => {
      await catchRevert(
        _contract.purchaseCourse(courseId, proof, {
          from: buyer,
          value,
        })
      );
    });
    it("Can get the purchased course hash by index", async () => {
      const index = 0;
      courseHash = await _contract.getCourseHashAtIndex(index);
      const expectedHash = web3.utils.soliditySha3(
        { type: "bytes16", value: courseId },
        { type: "address", value: buyer }
      );

      assert.equal(
        courseHash,
        expectedHash,
        "Purchased course cannot be got by index"
      );
    });

    it("should match the data of the course purchased by buyer", async () => {
      const expectedIndex = 0;
      const expectedState = 0;
      const course = await _contract.getCourseByHash(courseHash);

      assert.equal(course.id, expectedIndex, "indexes are not matching");
      assert.equal(
        course.price,
        value,
        "Course price not matching with the test value"
      );

      assert.equal(
        course.owner,
        buyer,
        "course owner and buyer are not matching"
      );
      assert.equal(
        course.proof,
        proof,
        "course proof and expected proof are not matching"
      );
      assert.equal(
        course.state,
        expectedState,
        "course purchase states are not matching"
      );
    });
  });

  describe("Can activate purchased course", () => {
    it("should not be able to activate course by non other than contract owner", async () => {
      await catchRevert(
        _contract.activateCourse(courseHash, {
          from: buyer,
        })
      );
    });
    it("should have a state of 'activated'", async () => {
      await _contract.activateCourse(courseHash, {
        from: contractOwner,
      });

      const course = await _contract.getCourseByHash(courseHash);
      const expectedState = 1;

      assert.equal(
        course.state,
        expectedState,
        "course state not matching 'activated' state"
      );
    });
  });

  describe("Can transfer ownership", () => {
    let currentOwner = null;
    before(async () => {
      currentOwner = await _contract.getContractOwner();
    });

    it("get contract owner", async () => {
      assert.equal(
        contractOwner,
        currentOwner,
        "Current owner isn't the deployer"
      );
    });

    it("Allows Only contract owner to transfer contract ownership ", async () => {
      await catchRevert(
        _contract.transferOwnerShip(newOwner, {
          from: buyer,
        })
      );
    });
    it("Allows owner be transfered ", async () => {
      await _contract.transferOwnerShip(newOwner, {
        from: contractOwner,
      });

      const owner = await _contract.getContractOwner();

      assert.equal(
        owner,
        newOwner,
        "Current owner should be equal to the new owner"
      );
    });

    it("transfers ownership back to original contract owner ", async () => {
      const owner = await _contract.getContractOwner();
      await _contract.transferOwnerShip(contractOwner, {
        from: owner,
      });
      const originalOwner = await _contract.getContractOwner();

      assert.equal(
        originalOwner,
        contractOwner,
        "Current owner should be the original contract owner"
      );
    });
  });
  describe("Can deactivate a course:(ME)", () => {
    it("Only contract owner can deactivate", async () => {
      await catchRevert(
        _contract.deactivateCourse(courseHash, {
          from: buyer,
        })
      );
    });

    it("should not deactivate already deactivated course", async () => {
      before(async () => {
        await _contract.deactivateCourse(courseHash, {
          from: contractOwner,
        });
      });

      await catchRevert(
        _contract.deactivateCourse(courseHash, {
          from: contractOwner,
        })
      );
    });
    it("should deactivate a JUST purchased course", async () => {
      const latestCourseId = "0x00000000000000000000000000003131";
      const latestProof =
        "0x0000000000000000000000000000313100000000000000000000000000003131";
      const latestValue = "9000000000";
      await _contract.purchaseCourse(latestCourseId, latestProof, {
        from: secondBuyer,
        value: latestValue,
      });
      const latestCourseHash = await _contract.getCourseHashAtIndex(1);

      await _contract.deactivateCourse(latestCourseHash, {
        from: contractOwner,
      });
      const course2 = await _contract.getCourseByHash(latestCourseHash);
      const expectedState = 2;

      assert.equal(
        course2.state,
        expectedState,
        "course state not matching 'activated' state"
      );
    });
  });
  describe("Can deactivate a course :(Instructor)", () => {
    let courseHash2 = null;
    let currentOwner = null;
    before(async () => {
      await _contract.purchaseCourse(courseId2, proof2, {
        from: buyer,
        value,
      });
      courseHash2 = await _contract.getCourseHashAtIndex(2);
      currentOwner = await _contract.getContractOwner();
    });

    it("Allows only contract owner to deactivate", async () => {
      await catchRevert(
        _contract.deactivateCourse(courseHash2, {
          from: buyer,
        })
      );
    });

    it("Should have a 'Deactivated' status and price of 0", async () => {
      const balanceBeforeTx = await getBalance(buyer);
      const contractBalanceBeforeTx = await getBalance(_contract.address);
      const currentOwnerBalanceBeforeTx = await getBalance(currentOwner);
      const result = await _contract.deactivateCourse(courseHash2, {
        from: contractOwner,
      });
      const balanceAfterTx = await getBalance(buyer);
      const contractBalanceAfterTx = await getBalance(_contract.address);
      const currentOwnerBalanceAfterTx = await getBalance(currentOwner);
      const gas = await getGas(result);

      const course = await _contract.getCourseByHash(courseHash2);
      const expectedState = 2;
      const expectedPrice = 0;

      assert.equal(
        course.state,
        expectedState,
        "course state not matching 'deactivated' state"
      );
      assert.equal(course.price, expectedPrice, "course price is not 0");

      assert.equal(
        toBN(balanceBeforeTx).add(toBN(value)).toString(),
        toBN(balanceAfterTx).toString(),
        "Buyer balance is not correct!"
      );
      assert.equal(
        toBN(contractBalanceBeforeTx).sub(toBN(value)).toString(),
        toBN(contractBalanceAfterTx).toString(),
        "Contract balance is not correct!"
      );
      assert.equal(
        toBN(currentOwnerBalanceAfterTx).add(gas).toString(),
        toBN(currentOwnerBalanceBeforeTx).toString(),
        "Current Owner balance is not correct!"
      );
      // repetion test
      assert.equal(
        toBN(currentOwnerBalanceBeforeTx).sub(gas).toString(),
        toBN(currentOwnerBalanceAfterTx).toString(),
        "Current Owner balance is not correct!"
      );
    });

    it("Should NOT activate a deactivated course", async () => {
      await catchRevert(
        _contract.activateCourse(courseHash2, {
          from: contractOwner,
        })
      );
    });
  });

  describe("Repurchase course", () => {
    let courseHash2 = null;

    before(async () => {
      courseHash2 = await _contract.getCourseHashAtIndex(2);
    });

    it("should NOT repurchase when the course doesn't exist", async () => {
      const notExistingHash =
        "0x5ceb3f8075c3dbb5d490c8d1e6c950302ed065e1a9031750ad2c6513069e3fc3";
      await catchRevert(
        _contract.repurchaseCourse(notExistingHash, { from: buyer })
      );
    });

    it("should NOT repurchase with a different buyer", async () => {
      const notOwnerAddress = accounts[4];
      await catchRevert(
        _contract.repurchaseCourse(courseHash2, { from: notOwnerAddress })
      );
    });

    it("should be able repurchase with the original buyer", async () => {
      const balanceBeforeTx = await getBalance(buyer);
      const contractBalanceBeforeTx = await getBalance(_contract.address);
      const result = await _contract.repurchaseCourse(courseHash2, {
        from: buyer,
        value,
      });
      const balanceAfterTx = await getBalance(buyer);
      const contractBalanceAfterTx = await getBalance(_contract.address);

      const gas = await getGas(result);

      const course = await _contract.getCourseByHash(courseHash2);
      const expectedState = 0;

      assert.equal(
        course.state,
        expectedState,
        "The course is not in purchased state"
      );
      assert.equal(
        course.price,
        value,
        `The course price is not equal to ${value}`
      );
      assert.equal(
        toBN(balanceBeforeTx).sub(toBN(value)).sub(toBN(gas)).toString(),
        toBN(balanceAfterTx).toString(),
        "Client balance is not correct!"
      );
      assert.equal(
        toBN(contractBalanceAfterTx).sub(toBN(value)).toString(),
        toBN(contractBalanceBeforeTx).toString(),
        "Contract balance is not correct!"
      );
      // Repetition of above in a different perspective
      assert.equal(
        toBN(contractBalanceBeforeTx).add(toBN(value)).toString(),
        toBN(contractBalanceAfterTx).toString(),
        "Contract balance is not correct!"
      );
    });

    it("should NOT be able to repurchase purchased course", async () => {
      await catchRevert(
        _contract.repurchaseCourse(courseHash2, { from: buyer })
      );
    });
  });

  describe("Receive funds", () => {
    it("should have transacted funds", async () => {
      const value = web3.utils.toWei("0.1", "ether");
      const contractBalanceBeforeTx = await getBalance(_contract.address);
      await web3.eth.sendTransaction({
        from: buyer,
        to: _contract.address,
        value,
      });
      const contractBalanceAfterTx = await getBalance(_contract.address);
      const increasedAmount = contractBalanceAfterTx - contractBalanceBeforeTx;
      assert.equal(
        value,
        increasedAmount,
        "Increased amount is not equal to value sent"
      );
      // Repetition
      assert.equal(
        toBN(contractBalanceBeforeTx).add(toBN(value)).toString(),
        toBN(contractBalanceAfterTx).toString(),
        "Value after transaction is not matching"
      );
    });
  });

  describe("Normal withdraw", () => {
    const amount = web3.utils.toWei("0.1", "ether");
    const fundsToDeposit = web3.utils.toWei("0.2", "ether");
    const overLimitFunds = web3.utils.toWei("1000", "ether");
    let currentOwner = null;
    before(async () => {
      currentOwner = await _contract.getContractOwner();
      await web3.eth.sendTransaction({
        from: buyer,
        to: _contract.address,
        value: fundsToDeposit,
      });
    });
    it("should fail if withdrawer is not the contract owner", async () => {
      await catchRevert(_contract.withdraw(amount, { from: buyer }));
    });
    it("should not withdraw overlimit value", async () => {
      await catchRevert(
        _contract.withdraw(overLimitFunds, { from: currentOwner })
      );
    });
    it("should allow successful withdraw:(ME)", async () => {
      const currentOwnerBalanceBeforeTx = await getBalance(currentOwner);
      const result = await _contract.withdraw(amount, { from: currentOwner });
      const currentOwnerBalanceAfterTx = await getBalance(currentOwner);
      const gas = await getGas(result);
      assert.equal(
        toBN(currentOwnerBalanceBeforeTx).add(toBN(amount)).sub(gas).toString(),
        toBN(currentOwnerBalanceAfterTx).toString(),
        "Balances after transactions are the expected ones"
      );
    });
    it("should allow successful withdraw:(Instructor)", async () => {
      const ownerBalance = await getBalance(currentOwner);
      const result = await _contract.withdraw(amount, { from: currentOwner });
      const newOwnerBalance = await getBalance(currentOwner);

      const gas = await getGas(result);
      assert.equal(
        toBN(ownerBalance).add(toBN(amount)).sub(gas).toString(),
        toBN(newOwnerBalance).toString(),
        "Balances after transactions are the expected ones"
      );
    });
  });

  describe("Emergency withdraw", () => {
    let currentOwner;
    before(async () => {
      currentOwner = await _contract.getContractOwner();
    });
    after(async () => {
      await _contract.resumeContract({ from: currentOwner });
    });

    it("should fail when contract is not stopped", async () => {
      await catchRevert(_contract.emergencyWithdraw({ from: currentOwner }));
    });
    it("should transfer all contract funds to the contract owner", async () => {
      await _contract.stopContract({ from: currentOwner });
      const contractBalance = await getBalance(_contract.address);
      const ownerBalance = await getBalance(currentOwner);

      const result = await _contract.emergencyWithdraw({ from: currentOwner });
      const gas = await getGas(result);

      const newContractBalance = await getBalance(_contract.address);
      const newOwnerBalance = await getBalance(currentOwner);
      assert.equal(
        toBN(ownerBalance).add(toBN(contractBalance)).sub(gas).toString(),
        toBN(newOwnerBalance).toString(),
        "New owner balance does match the expected balance"
      );
    });
    it("contract balance should be 0", async () => {
      await _contract.stopContract({ from: currentOwner });

      const contractBalance = await getBalance(_contract.address);

      assert.equal(0, contractBalance, "New Contract balance should be 0");
    });
  });

  describe("Self destruct", () => {
    let currentOwner;
    before(async () => {
      currentOwner = await _contract.getContractOwner();
    });

    it("should fail when contract is not stopped", async () => {
      await catchRevert(_contract.selfDestruct({ from: currentOwner }));
    });
    it("should transfer all contract funds to the contract owner", async () => {
      await _contract.stopContract({ from: currentOwner });
      const contractBalance = await getBalance(_contract.address);
      const ownerBalance = await getBalance(currentOwner);

      const result = await _contract.selfDestruct({ from: currentOwner });
      const gas = await getGas(result);

      const newOwnerBalance = await getBalance(currentOwner);
      assert.equal(
        toBN(ownerBalance).add(toBN(contractBalance)).sub(gas).toString(),
        toBN(newOwnerBalance).toString(),
        "New owner balance does match the expected balance"
      );
    });
    it("checks if contract balance is be 0", async () => {
      await _contract.selfDestruct({ from: currentOwner });

      const contractBalance = await getBalance(_contract.address);

      assert.equal(0, contractBalance, "New Contract balance should be 0");
    });
    it("checks if the contract has been destroyed by having 0x bytecode ", async () => {
      const code = await web3.eth.getCode(_contract.address);

      assert.equal("0x", code, "Contract is not destroyed");
    });
  });
});
