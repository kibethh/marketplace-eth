const CourseMarketplace = artifacts.require("CourseMarketplace");

contract("CourseMarketplace", (accounts) => {
  const courseId = "0x00000000000000000000000000003130";
  const proof =
    "0x0000000000000000000000000000313000000000000000000000000000003130";
  const value = "9000000000";

  let _contract = null;
  let contractOwner = null;
  let buyer = null;

  before(async () => {
    _contract = await CourseMarketplace.deployed();
    contractOwner = accounts[0];
    buyer = accounts[1];
  });

  describe("Purchase new course", () => {
    let courseHash;
    before(async () => {
      await _contract.purchaseCourse(courseId, proof, {
        from: buyer,
        value,
      });
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
        "Course hash should match with the expected hash!"
      );
    });

    it("should match the data of the course purchased by buyer", async () => {
      const expectedIndex = 0;
      const expectedState = 0;
      const course = await _contract.getCourseByHash(courseHash);
      //   id:id,
      //   price:msg.value,
      //   proof:proof,
      //   owner:msg.sender,
      //   state:State.Purchased

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
});
