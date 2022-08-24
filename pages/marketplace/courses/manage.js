import { BaseLayout } from "@components/ui/layout";
import { MarketHeader } from "@components/ui/marketplace";
import { OwnedCourseCard } from "@components/ui/course";
import React from "react";

function ManageCourses() {
  return (
    <>
      <MarketHeader />
      <section className="grid grid-cols-1">
        <OwnedCourseCard />
      </section>
    </>
  );
}

export default ManageCourses;

ManageCourses.Layout = BaseLayout;
