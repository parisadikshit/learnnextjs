import express from "express";
const router = express.Router();

import { requireSignin } from "../middlewares";

import {
  makeInstructor,
  getAccountStatus,
  currentInstructor,
  instructorCourses,
  studentCount,
  instructorBalance,
} from "../controllers/instructor.js";

router.post("/make-instructor", requireSignin, makeInstructor);
router.post("/get-account-status", requireSignin, getAccountStatus);

router.get("/current-instructor", requireSignin, currentInstructor);
router.get("/instructor-courses", requireSignin, instructorCourses);
router.post("/instructor/student-count", requireSignin, studentCount);

router.get("/instructor/balance", requireSignin, instructorBalance);

module.exports = router;
