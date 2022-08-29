import { CourseCard, CourseList } from "@components/ui/course";
import { BaseLayout } from "@components/ui/layout";
import { getAllCourses } from "@content/courses/fetcher";
import { useWalletInfo } from "@components/hooks/web3";
import { Button, Loader, Message } from "@components/ui/common";
import { OrderModal } from "@components/ui/order";
import { useState } from "react";
import { MarketHeader } from "@components/ui/marketplace";
import { useWeb3 } from "@components/providers";
import { useOwnedCourses } from "@components/hooks/web3";
import { COURSE_STATES } from "@utils/normalize";

export default function Marketplace({ courses }) {
  const { web3, contract, requireInstall } = useWeb3();
  const { hasConnectedWallet, account, isConnecting, network } =
    useWalletInfo();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const { ownedCourses } = useOwnedCourses(courses, account.data, network.data);

  const purchaseCourse = async (order) => {
    const hexCourseId = web3.utils.utf8ToHex(selectedCourse.id);
    const orderHash = web3.utils.soliditySha3(
      { type: "bytes16", value: hexCourseId },
      { type: "address", value: account.data }
    );
    const emailHash = web3.utils.sha3(order.email);
    const proof = web3.utils.soliditySha3(
      { type: "bytes32", value: emailHash },
      { type: "bytes32", value: orderHash }
    );

    const value = web3.utils.toWei(String(order.price));

    try {
      const result = await contract.methods
        .purchaseCourse(hexCourseId, proof)
        .send({ from: account.data, value });
      console.log(result);
    } catch {
      console.error("Purchase course: Operation has failed.");
    }
  };

  return (
    <>
      <MarketHeader />
      <CourseList courses={courses}>
        {(course) => (
          <CourseCard
            key={course.id}
            course={course}
            disabled={!hasConnectedWallet}
            Footer={() => {
              if (requireInstall) {
                return (
                  <Button disabled={true} variant="lightPurple">
                    Install Metamask
                  </Button>
                );
              }
              if (isConnecting) {
                return (
                  <Button disabled={true} variant="lightPurple">
                    <Loader size="sm" />
                  </Button>
                );
              }
              if (!ownedCourses.hasInitialResponse) {
                return <div style={{ height: "50px" }}></div>;
              }

              const owned = ownedCourses.lookup[course.id];
              if (owned) {
                return (
                  <>
                    <Button disabled={true} variant="green">
                      Owned
                    </Button>
                    <div className="mt-1">
                      {owned.state == COURSE_STATES[1] && (
                        <Message size="sm">Activated</Message>
                      )}
                      {owned.state == COURSE_STATES[2] && (
                        <Message size="sm" type="danger">
                          Deactivated
                        </Message>
                      )}
                      {owned.state == COURSE_STATES[0] && (
                        <Message size="sm" type="warning">
                          Waiting for activation...
                        </Message>
                      )}
                    </div>
                  </>
                );
              }

              return (
                <Button
                  onClick={() => setSelectedCourse(course)}
                  disabled={!hasConnectedWallet}
                  variant="lightPurple"
                >
                  Purchase
                </Button>
              );
            }}
          />
        )}
      </CourseList>
      {selectedCourse && (
        <OrderModal
          course={selectedCourse}
          onSubmit={purchaseCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </>
  );
}

export function getStaticProps() {
  const { data } = getAllCourses();
  return {
    props: {
      courses: data,
    },
  };
}

Marketplace.Layout = BaseLayout;
