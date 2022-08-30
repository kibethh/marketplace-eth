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
  const { hasConnectedWallet, account, isConnecting } = useWalletInfo();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const { ownedCourses } = useOwnedCourses(courses, account.data);
  const [isNewPurchase, setIsNewPurchase] = useState(true);

  const purchaseCourse = async (order) => {
    const hexCourseId = web3.utils.utf8ToHex(selectedCourse.id);
    const orderHash = web3.utils.soliditySha3(
      { type: "bytes16", value: hexCourseId },
      { type: "address", value: account.data }
    );

    const value = web3.utils.toWei(String(order.price));

    if (isNewPurchase) {
      const emailHash = web3.utils.sha3(order.email);
      const proof = web3.utils.soliditySha3(
        { type: "bytes32", value: emailHash },
        { type: "bytes32", value: orderHash }
      );

      await _purchaseCourse(hexCourseId, proof, value);
    }
    if (!isNewPurchase) {
      await _repurchaseCourse(orderHash, value);
    }
  };

  const _purchaseCourse = async (hexCourseId, proof, value) => {
    try {
      const result = await contract.methods
        .purchaseCourse(hexCourseId, proof)
        .send({ from: account.data, value });
    } catch {
      console.error("Purchase course: Operation has failed.");
    }
  };
  const _repurchaseCourse = async (courseHash, value) => {
    try {
      const result = await contract.methods
        .repurchaseCourse(courseHash)
        .send({ from: account.data, value });
    } catch {
      console.error("Purchase course: Operation has failed.");
    }
  };

  return (
    <>
      <MarketHeader />
      <CourseList courses={courses}>
        {(course) => {
          const owned = ownedCourses.lookup[course.id];

          return (
            <CourseCard
              key={course.id}
              course={course}
              disabled={!hasConnectedWallet}
              state={owned?.state}
              Footer={() => {
                if (requireInstall) {
                  return (
                    <Button disabled={true} size="sm" variant="lightPurple">
                      Install Metamask
                    </Button>
                  );
                }
                if (isConnecting) {
                  return (
                    <Button size="sm" disabled={true} variant="lightPurple">
                      <Loader size="sm" />
                    </Button>
                  );
                }
                if (!ownedCourses.hasInitialResponse) {
                  return <div style={{ height: "42px" }}></div>;
                }

                if (owned) {
                  return (
                    <>
                      <div className="flex">
                        <Button
                          size="sm"
                          onClick={() => alert("You own this course.")}
                          disabled={false}
                          variant="white"
                        >
                          Yours &#10004;
                        </Button>
                        {owned.state === COURSE_STATES[2] && (
                          <div className="ml-1">
                            <Button
                              size="sm"
                              onClick={() => {
                                setIsNewPurchase(false);
                                setSelectedCourse(course);
                              }}
                              disabled={false}
                              variant="purple"
                            >
                              Require Funding
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  );
                }

                return (
                  <Button
                    size="sm"
                    onClick={() => setSelectedCourse(course)}
                    disabled={!hasConnectedWallet}
                    variant="lightPurple"
                  >
                    Purchase
                  </Button>
                );
              }}
            />
          );
        }}
      </CourseList>
      {selectedCourse && (
        <OrderModal
          course={selectedCourse}
          isNewPurchase={isNewPurchase}
          onSubmit={purchaseCourse}
          onClose={() => {
            setSelectedCourse(null);
            setIsNewPurchase(true);
          }}
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
