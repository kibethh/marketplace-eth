// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract CourseMarketplace{

        enum State{
            Purchased,
            Activated,
            Deactivated
        }


        struct Course{
            uint id;
            uint price;
            bytes32 proof;
            address owner;
            State state;
        }

        //mapping of the courseHash to Course data
        mapping(bytes32=>Course) private ownedCourses;
        //mapping of the courseId to courseHash 
        mapping(uint=>bytes32) private ownedCourseHash;

        // Number of all courses + id of the course
        uint private totalOwnedCourses;

        address payable private owner;

        constructor(){
            setContractOwner(msg.sender);
          
        }

        ///Course already purchased!    
        error CourseHasOwner();
        ///Only owner has an access!    
        error OnlyOwner();

        modifier onlyOwner(){
            if(msg.sender!=getContractOwner()){
                revert OnlyOwner();
            }
            _;
        }


        // courseId - 10 - 0x00000000000000000000000000003130
        // proof  - 0x0000000000000000000000000000313000000000000000000000000000003130
        function purchaseCourse(bytes16 courseId,bytes32 proof)external payable 
        {
        bytes32 courseHash=keccak256(abi.encodePacked(courseId,msg.sender));

        if(hasCourseOwnership(courseHash)){
            revert CourseHasOwner();
        }

        uint id = totalOwnedCourses++;
        ownedCourseHash[id]=courseHash;
        ownedCourses[courseHash]=Course({
            id:id,
            price:msg.value,
            proof:proof,
            owner:msg.sender,
            state:State.Purchased
        });
        

        }


        function transferOwnerShip(address newOwner)external onlyOwner {
            
            setContractOwner(newOwner);

        }

        function getCourseCount() external view returns(uint){
            return totalOwnedCourses;
        }

        function getCourseHashAtIndex(uint index) external view returns(bytes32){
        return ownedCourseHash[index];
        } 
        function getCourseByHash(bytes32 courseHash) external view returns(Course memory){        
        return ownedCourses[courseHash];
        } 
        function getContractOwner() public view returns(address){
            return owner;
        }

        function setContractOwner(address newOwner)private{
            owner=payable(newOwner);
        }

        function hasCourseOwnership(bytes32 courseHash) private view returns(bool){
        return ownedCourses[courseHash].owner == msg.sender;
        }
}