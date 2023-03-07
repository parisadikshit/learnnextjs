import express from "express";
import formidable from "express-formidable"; // npm i express-formidable
const router = express.Router();

//controllers
import { isInstructor, requireSignin, isEnrolled } from "../middlewares";

import {
  uploadImage,
  removeImage,
  create,
  read,
  uploadVideo,
  removeVideo,
  addLesson,
  update,
  removeLesson,
  updateLesson,
  publishCourse,
  unpublishCourse,
  courses,
  checkEnrollment,
  freeEnrollment,
  paidEnrollment,
  checkout,
  paymentVerification,
  userCourses,
  markCompleted,
  listCompleted,
  markIncomplete,
  stripeSuccess,
} from "../controllers/course";

// get all courses and launch it on application

router.get("/courses", courses);

//image
router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);
// course
router.post("/course", requireSignin, isInstructor, create);
router.put("/course/:slug", requireSignin, update);
router.get("/course/:slug", read);
router.post(
  "/course/video-upload/:instructorId",
  requireSignin,
  formidable(),
  uploadVideo
);
router.post("/course/video-remove/:instructorId", requireSignin, removeVideo);

// publish and unpublish
router.put("/course/publish/:courseId", requireSignin, publishCourse);
router.put("/course/unpublish/:courseId", requireSignin, unpublishCourse);

// "api/course/lesson/${slug}${course.instrictoer._id"
router.post("/course/lesson/:slug/:instructorId", requireSignin, addLesson);
router.put("/course/lesson/:slug/:instructorId", requireSignin, updateLesson);

router.put("/course/:slug/:lessonId", requireSignin, removeLesson);

router.get("/check-enrollment/:courseId", requireSignin, checkEnrollment);

//enrollment

router.post("/free-enrollment/:courseId", requireSignin, freeEnrollment);

router.post("/checkout", requireSignin, checkout);
router.post("/paid-enrollment/:courseId", requireSignin, paidEnrollment);
router.get("/stripe-success/:courseId", requireSignin, stripeSuccess);
router.post(
  "/paid-enrollment/paymentverification",
  requireSignin,
  paymentVerification
);
router.get("/user-courses", requireSignin, userCourses);

router.get("/user/course/:slug", requireSignin, isEnrolled, read);

//mark completed
router.post("/mark-completed", requireSignin, markCompleted);

router.post("/list-completed", requireSignin, listCompleted);
router.post("/mark-incomplete", requireSignin, markIncomplete);
// router.post("/paid-enrollment/:courseId", requireSignin, checkout);

module.exports = router;
