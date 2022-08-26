import { useAccount, useOwnedCourse } from "@components/hooks/web3";
import { Message, Modal } from "@components/ui/common";
import { CourseHero, Curriculum, Keypoints } from "@components/ui/course";
import { BaseLayout } from "@components/ui/layout";
import { getAllCourses } from "@content/courses/fetcher";
import { COURSE_STATES } from "@utils/normalize";

export default function Course({ course }) {
  const { account } = useAccount();
  const { ownedCourse } = useOwnedCourse(course, account.data);
  const courseState = ownedCourse.data?.state;

  const isLocked =
    courseState === COURSE_STATES[0] || courseState === COURSE_STATES[2];
  return (
    <>
      <div className="py-4">
        <CourseHero
          hasOwner={!!ownedCourse.data}
          title={course.title}
          description={course.description}
          image={course.coverImage}
        />
      </div>
      {courseState && (
        <div className="max-w-5xl mx-auto">
          {courseState === COURSE_STATES[0] && (
            <Message type="warning">
              Course is purchased and awaiting activation. Processing can take
              upto 24hrs.
              <i className="block font-normal">
                In case of any questions, please contact our company
              </i>
            </Message>
          )}
          {courseState === COURSE_STATES[1] && (
            <Message type="success">
              Wishing you happy watching of the course.
            </Message>
          )}
          {courseState === COURSE_STATES[2] && (
            <Message type="danger">
              Course has been deactivated due to the incorrect purchase data.
              The functionality to watch the course has been temporarily
              disabled.
              <i className="block font-normal">Please contact our company</i>
            </Message>
          )}
        </div>
      )}
      <Keypoints points={course.wsl} />
      <Curriculum locked={isLocked} courseState={courseState} />
      <Modal />
    </>
  );
}

export function getStaticPaths() {
  const { data } = getAllCourses();

  return {
    paths: data.map((c) => ({
      params: {
        slug: c.slug,
      },
    })),
    fallback: false,
  };
}

export function getStaticProps({ params }) {
  const { data } = getAllCourses();
  const course = data.filter((c) => c.slug === params.slug)[0];

  return {
    props: {
      course,
    },
  };
}

Course.Layout = BaseLayout;
