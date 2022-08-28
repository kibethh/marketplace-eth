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

        ///Sender is not course owner!    
        error SenderIsNotCourseOwner();
        ///Course already purchased!    
        error CourseHasOwner();
        ///Only owner has an access!    
        error OnlyOwner();
        ///Course is not created!  
        error CourseIsNotCreated();
        ///Invalid state for course modification!  
        error InvalidState();

        modifier onlyOwner(){
            if(msg.sender!=getContractOwner()){
                revert OnlyOwner();
            }
            // require(msg.sender==getContractOwner(),"Only owner has an access");
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
        // require(!hasCourseOwnership(courseHash),"Course already purchased!");

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


        function repurchaseCourse(bytes32 courseHash) external payable{
        if(!isCourseCreated(courseHash)){
            revert CourseIsNotCreated();
         }
        if(!hasCourseOwnership(courseHash)){
            revert SenderIsNotCourseOwner();

        }

        Course storage course = ownedCourses[courseHash];

        if(course.state!=State.Deactivated){
            revert InvalidState();
        }
        course.state=State.Purchased;
        course.price=msg.value;

        }

        function activateCourse(bytes32 courseHash) external onlyOwner{
          if(!isCourseCreated(courseHash)){
            revert CourseIsNotCreated();
          }
        // require(isCourseCreated(courseHash),"Course is not created!");
        Course storage course = ownedCourses[courseHash];
        if( course.state!=State.Purchased){
            revert InvalidState();
        }

        // require(course.state==State.Purchased,"Invalid state for course activation");
        course.state=State.Activated;
        

        }

        function deactivateCourse(bytes32 courseHash) external onlyOwner{
        // if(!isCourseCreated(courseHash)){
        //     revert CourseIsNotCreated();
        // }
        require(isCourseCreated(courseHash),"Course is not created!");
        Course storage course = ownedCourses[courseHash];
        // if(course.state!=State.Purchased){
        //     revert InvalidState();
        // }

        require((course.state==State.Purchased),"Invalid state for course activation");

        (bool success,)= course.owner.call{value: course.price}("");
        require(success,"Transfer failed!");

        course.state=State.Deactivated;
        course.price=0;
        

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

        function isCourseCreated(bytes32 courseHash) private view returns(bool){
        return ownedCourses[courseHash].owner !=0x0000000000000000000000000000000000000000;
        }

        function hasCourseOwnership(bytes32 courseHash) private view returns(bool){
        return ownedCourses[courseHash].owner == msg.sender;
        }
}