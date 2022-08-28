const CourseMarketplace = artifacts.require("CourseMarketplace");
const { assert } = require("chai");
const { catchRevert } = require("./utils/exceptions");

contract("CourseMarketplace", (accounts) => {
  const courseId = "0x00000000000000000000000000003130";
  const proof =
    "0x0000000000000000000000000000313000000000000000000000000000003130";
  const value = "9000000000";

  let _contract = null;
  let contractOwner = null;
  let newOwner = null;
  let buyer = null;
  let courseHash = null;

  before(async () => {
    _contract = await CourseMarketplace.deployed();
    contractOwner = accounts[0];
    buyer = accounts[1];
    newOwner = accounts[2];
  });

  describe("Purchase new course", () => {
    before(async () => {
      await _contract.purchaseCourse(courseId, proof, {
        from: buyer,
        value,
      });
    });
    it("should not repurchased course similar course", async () => {
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

      // expect(courseHash).to.be.equal(expectedHash);
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
});
