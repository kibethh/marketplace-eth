const CourseMarketplace = artifacts.require("CourseMarketplace");
const { assert, expect } = require("chai");
const { catchRevert } = require("./utils/exceptions");

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
    before(async () => {
      await _contract.purchaseCourse(courseId2, proof2, {
        from: buyer,
        value,
      });
      courseHash2 = await _contract.getCourseHashAtIndex(2);
    });

    it("Allows only contract owner to deactivate", async () => {
      await catchRevert(
        _contract.deactivateCourse(courseHash2, {
          from: buyer,
        })
      );
    });
    it("Should have a 'Deactivated' status and price of 0", async () => {
      await _contract.deactivateCourse(courseHash2, {
        from: contractOwner,
      });
      const course = await _contract.getCourseByHash(courseHash2);
      const expectedState = 2;
      const expectedPrice = 0;

      assert.equal(
        course.state,
        expectedState,
        "course state not matching 'deactivated' state"
      );
      assert.equal(course.price, expectedPrice, "course price is not 0");
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
      await _contract.repurchaseCourse(courseHash2, { from: buyer, value });
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
    });

    it("should NOT be able to repurchase purchased course", async () => {
      await catchRevert(
        _contract.repurchaseCourse(courseHash2, { from: buyer })
      );
    });
  });
});
