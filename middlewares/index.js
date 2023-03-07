import UserNav from "../../client/components/nav/UserNav";
import User from "../models/user";
import Course from "../models/course";

var { expressjwt: jwt } = require("express-jwt");

export const requireSignin = jwt({
  getToken: (req, res) => req.cookies.token,
  secret: process.env.JWT_SECRET,

  algorithms: ["HS256"],
});

// default requireSignin;

export const isInstructor = async (req, res, next) => {
  try {
    console.log("in isinstructor");
    const user = await User.findById(req.auth._id).exec();
    console.log(user);
    if (!user.role.includes("Instructor")) {
      return res.sendStatus(403);
    } else {
      next();
    }
    // if (user === null) {
    //   return res.sendStatus(403);
    // } else {
    //   next();
    // }
    console.log("end isinstructor");
  } catch (err) {
    console.log(err);
  }
};

export const isEnrolled = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth._id).exec();
    const course = await Course.findOne({ slug: req.params.slug }).exec();

    //check if course id is found in user courses array
    let ids = [];
    for (let i = 0; i < user.courses.length; i++) {
      ids.push(user.courses[i].toString());
    }

    if (!ids.includes(course._id.toString())) {
      res.sendStatus(403);
    } else {
      next();
    }
  } catch (err) {
    console.log(err);
  }
};
