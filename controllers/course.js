import AWS from "aws-sdk";
import { nanoid } from "nanoid";
import Course from "../models/course";
import Completed from "../models/completed";
import slugify from "slugify";
import { readFileSync } from "fs";
import User from "../models/user";
import { instance } from "../server.js";
import course from "../models/course";
// const fs = require("fs");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
};

const S3 = new AWS.S3(awsConfig);
export const uploadImage = async (req, res) => {
  // console.log(req.body);
  console.log("shubham");
  try {
    const { image } = req.body;
    if (!image) return res.status(400).send("No Image");

    //prepare the image

    const base64Data = new Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    const type = image.split(";")[0].split("/")[1];

    const params = {
      Bucket: "learnmyway-bucket",
      Key: ` ${nanoid()}.${type}`,
      Body: base64Data,
      ACL: "public-read",
      ContentEncoding: "base64",
      ContentType: `image/${type}`,
    };

    S3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        return res.sendStatus(400);
      }
      console.log(data);
      res.send(data);
    });
  } catch (err) {
    console.log(err);
  }
};

export const removeImage = async (req, res) => {
  try {
    console.log("shubhajm");

    const { image } = req.body;
    console.log(image);
    const params = {
      Bucket: image.data.Bucket,

      Key: image.data.Key,
    };
    console.log(req.body.Bucket);
    console.log(req.body.Key);
    //send remove request to s3
    S3.deleteObject(params, (err, data) => {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      }
      res.send({ ok: true });
    });
  } catch (err) {
    console.log(err);
  }
};
//
export const create = async (req, res) => {
  // console.log("in controller create course,js");
  // console.log("create course", req.body);
  // return;
  // console.log(req);
  console.log(req.body.values.name);
  try {
    const alreadyExist = await Course.findOne({
      slug: slugify(req.body.values.name.toLowerCase()),
    });

    if (alreadyExist) return res.status(400).send("Title is taken");

    const course = await new Course({
      slug: slugify(req.body.values.name),
      instructor: req.auth._id,
      ...req.body.values,
      image: req.body.image.data,
    }).save();

    res.json(course);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Course create failed. Try again");
  }
};

export const read = async (req, res) => {
  console.log(" slug: req.params.slug ", req.params.slug);
  console.log("in read", req);
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate("instructor", "_id name")
      .exec();
    res.json(course);
  } catch (err) {
    console.log(err);
  }
};

export const uploadVideo = async (req, res) => {
  try {
    console.log("req.user._id", req.auth._id);
    console.log("req.params.instructorId::;", req.params.instructorId);

    if (req.auth._id != req.params.instructorId) {
      return res.status(400).send("Unauthoruzed");
    }
    const { video } = req.files;
    // console.log(video);
    if (!video) return res.status(400).send("No Video");

    const params = {
      Bucket: "learnmyway-bucket",
      Key: ` ${nanoid()}.${video.type.split("/")[1]}`, //split video/mp4 take mp4
      Body: readFileSync(video.path),
      ACL: "public-read",
      ContentType: video.type,
    };
    S3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      }
      console.log(data);
      res.send(data);
    });
  } catch (err) {
    console.log(err);
  }
};

export const removeVideo = async (req, res) => {
  try {
    if (req.auth._id != req.params.instructorId) {
      return res.status(400).send("Unauthorized");
    }
    const { Bucket, Key } = req.body;

    const params = {
      Bucket,
      Key, //split video/mp4 take mp4
    };
    S3.deleteObject(params, (err, data) => {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      }
      console.log(data);
      res.send({ ok: true });
    });
  } catch (err) {
    console.log("direct error madhe");
    console.log(err);
  }
};

export const addLesson = async (req, res) => {
  try {
    console.log(req);
    const { slug, instructorId } = req.params;
    const { title, content, video } = req.body;
    console.log(title);
    console.log(typeof title);
    if (req.auth._id != instructorId) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findOneAndUpdate(
      { slug },
      {
        $push: { lessons: { title, content, video, slug: slugify(title) } },
      },

      {
        new: true,
      }
    )
      .populate("instructor", "_id name")
      .exec();
    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Add Lesson failed");
  }
};

export const update = async (req, res) => {
  try {
    console.log("in update");
    const { slug } = req.params;
    console.log(slug);

    const course = await Course.findOne({ slug }).exec();
    console.log("course found =>> ", course);
    console.log(req.auth._id);
    console.log(req);
    if (req.auth._id != course.instructor._id) {
      return res.status(400).send("Unauthorized");
    }
    const updated = await Course.findOneAndUpdate({ slug }, req.body, {
      new: true,
    }).exec();

    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send(err.message);
  }
};

export const removeLesson = async (req, res) => {
  console.log("in remove lesson ctroller");
  const { slug, lessonId } = req.params;
  console.log("slug,params", slug, lessonId);
  const course = await Course.findOne({ slug }).exec();
  console.log("your course is ", course);
  console.log("course.instructor._id", course.instructor._id);
  if (req.auth._id != course.instructor._id) {
    return res.status(400).send("Unauthorized");
  }

  const deletedCourse = await Course.findByIdAndUpdate(course._id, {
    $pull: { lessons: { _id: lessonId } },
  }).exec();

  res.json({ ok: true });
};

export const updateLesson = async (req, res) => {
  try {
    console.log("lesson updated");
    console.log("Update Lesson", req.body);
    const { slug } = req.params;
    const { _id, title, content, video, free_preview } = req.body;
    console.log(
      "_id, title, content, video, free_preview ",
      _id,
      title,
      content,
      video,
      free_preview
    );
    const course = await Course.findOne({ slug }).select("instructor").exec();

    console.log(
      "course.instructor._id !=  req.auth._id",
      course.instructor._id,
      req.auth._id
    );

    if (course.instructor._id != req.auth._id) {
      return res.status(400).send("Unauthorized");
    }
    const updated = await Course.updateOne(
      { "lessons._id": _id },
      {
        $set: {
          "lessons.$.title": title,
          "lessons.$.content": content,
          "lessons.$.video": video,
          "lessons.$.free_preview": free_preview,
        },
      },
      { new: true }
    ).exec();
    console.log("Updated", updated);
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(400).send("update lesson failed");
  }
};

export const publishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select("instructor").exec();
    console.log("courseeeeeeeeee", course);
    if (course.instructor._id != req.auth._id) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findByIdAndUpdate(
      courseId,
      { published: true },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send("publish course Failed");
  }
};

export const unpublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select("instructor").exec();

    if (course.instructor._id != req.auth._id) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findByIdAndUpdate(
      courseId,
      { published: false },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Unpublish course Failed");
  }
};

export const courses = async (req, res) => {
  const all = await Course.find({ published: true })
    .populate("instructor", "_id name")
    .exec();
  console.log("in courses");
  res.json(all);
};

export const checkEnrollment = async (req, res) => {
  const { courseId } = req.params;
  //find  courses of the currently logged in user
  const user = await User.findById(req.auth._id).exec();

  //check if  course id is found in  user courses array
  let ids = [];
  let length = user.courses && user.courses.length;
  for (let i = 0; i < length; i++) {
    ids.push(user.courses[i].toString());
  }
  res.json({
    status: ids.includes(courseId),
    course: await Course.findById(courseId).exec(),
  });
};

export const freeEnrollment = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).exec();

    if (course.paid) return;

    const result = await User.findByIdAndUpdate(
      req.auth._id,
      {
        $addToSet: {
          courses: course._id,
        },
      },
      { new: true }
    ).exec();
    res.json({
      message: "Congratulations! You have successfullt enrolled",
      course: course,
    });
  } catch (err) {
    console.log("freee enrollment error", err);
    return res.status(400).send("Enrollment Failed");
  }
};

export const paidEnrollment = async (req, res) => {
  console.log("paid rnrollemnt");
  // console.log("req", req);

  try {
    const course = await Course.findById(req.params.courseId)
      .populate("instructor")
      .exec();
    // const { price } = course;

    if (!course.paid) return;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "INR",
            product_data: {
              name: course.name,
            },
            unit_amount: course.price * 100,
          },

          quantity: 1,
        },
      ],

      success_url: `${process.env.STRIPE_SUCCESS_URL}/${course._id}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}`,
    });
    console.log("session id ===>", session);

    await User.findByIdAndUpdate(req.auth._id, {
      stripeSession: session,
    }).exec();
    //  res.status(200).send({session.id, session.url})
    res.send(session.id);
  } catch (err) {
    console.log("Paid enrollment error", err);
    return res.status(400).send("Enrollment create Failed");
  }
  // } catch (err) {
  //   console.log(err);
  //   return res.status(400).send("Enrollment create Failed");
  // }
  // try {
  //   const course = await Course.findById(req.params.courseId)
  //     .populate("instructor")
  //     .exec();
  //   console.log(course);
  //   if (!course.paid) return;

  //   // application fee
  //   const fee = (course.price * 30) / 100;

  //   //create stripe session
  //   const session = await stripe.checkout.sessions.create({
  //     payment_method_types: ["card"],

  //     line_items: [
  //       {
  //         name: course.name,
  //         price: course.price,
  //         currency: "inr",
  //         quantity: 1,
  //       },
  //     ],
  //     payment_intent_data: {
  //       application_fee_amount: Math.round(fee.toFixed(2) * 100),
  //       transfer_data: {
  //         destination: course.instructor.stripe_account_id,
  //       },
  //     },
  //     // redirect url after sucssful payment
  //     success_url: `${process.env.STRIPE_SUCCESS_URL}/${course._id}`,
  //     cancel_url: process.env.STRIPE_CANCEL_URL,
  //   });

  //   console.log("session id ===>", session);

  //   await User.findByIdAndUpdate(req.auth._id, {
  //     stripeSession: session,
  //   }).exec();
  //   res.send(session.id);
  // } catch (err) {
  //   console.log("Paid enrollment error", err);
  //   return res.status(400).send("Enrollment create Failed");
  // }
};
export const stripeSuccess = async (req, res) => {
  try {
    // find the course
    const course = await Course.findById(req.params.courseId).exec();
    console.log(course);
    //get user from db to get stripe session id
    const user = await User.findById(req.auth._id).exec();
    console.log(user);
    // if no stripe session return
    if (!user.stripeSession.id) return res.sendStatus(400);

    //retrive stripe session
    const session = await stripe.checkout.sessions.retrieve(
      user.stripeSession.id
    );
    console.log("stripe success ", session);

    //if session payment status is paid   push course t users array
    if (session.payment_status === "paid");
    {
      await User.findByIdAndUpdate(user._id, {
        $addToSet: { courses: course._id },
        $set: { stripeSession: {} },
      }).exec();
    }
    res.json({ success: true, course });
  } catch (err) {
    console.log("Stripe success error", err);
    res.json({ success: false });
  }
};
export const checkout = async (req, res) => {
  console.log("paymnet req ", req);
  const { token } = req.body;
  // console.log("Product", product);
  // console.log("Product price", product.price);

  const idempotencyKey = uuid();

  return stripe.customers
    .create({
      email: token.email,
      source: token,
      id,
    })
    .then((customer) => {
      stripe.charges.create(
        {
          amount: 100,
          currency: "usd",
          customer: customer.id,
          receipt_email: token.email,
          description: `purchase of product.name`,
          shipping: {
            name: token.card.name,
            address: {
              country: token.card.address_country,
            },
          },
        },
        { idempotencyKey }
      );
    })
    .then((result) => res.status(200).json(result))
    .catch((err) => console.log(err));

  // const options = {
  //   amount: Number(req.body.price * 100),
  //   currency: "INR",
  //   // receipt: "order_rcptid_11",
  // };
  // console.log("In  checkout");
  // const order = await instance.orders.create(options);

  // console.log("order", order);
  // res.status(200).json({
  //   success: true,
  //   order,
  // });
};

export const paymentVerification = async (req, res) => {
  console.log("req body", req.body);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  console.log(
    "razorpay_order_id, razorpay_payment_id, razorpay_signature",
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  //  let body=req.body.response.razorpay_order_id + "|" + req.body.response.razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
    .update(body.toString())
    .digest("hex");
  console.log("sig received ", razorpay_signature);
  console.log("sig generated ", expectedSignature);

  const isAuthentic = razorpay_signature === expectedSignature;

  if (isAuthentic) {
    //DATABASE SAVE
    // await Payment.create({
    //   razorpay_order_id,
    //   razorpay_payment_id,
    //   razorpay_signature,
    // });
    res.redirect(
      `http://localhost:3000/paymentsuccess?reference=${razorpay_payment_id}`
    );
  } else {
    res.status(400).json({
      success: false,
    });
  }
};

export const userCourses = async (req, res) => {
  const user = await User.findById(req.auth._id).exec();

  const courses = await Course.find({ _id: { $in: user.courses } })
    .populate("instructor", "_id name")
    .exec();

  res.json(courses);
};

export const markCompleted = async (req, res) => {
  const { courseId, lessonId } = req.body;
  // console.log(courseId, lessonId);
  // find if user with that course is alreardy created
  const existing = await Completed.findOne({
    user: req.auth._id,
    course: courseId,
  }).exec();

  if (existing) {
    //update
    const updated = await Completed.findOneAndUpdate(
      {
        user: req.auth._id,
        course: courseId,
      },
      {
        $addToSet: { lessons: lessonId },
      }
    ).exec();
    res.json({ ok: true });
  } else {
    const created = await new Completed({
      user: req.auth._id,
      course: courseId,
      lessons: lessonId,
    }).save();
    res.json({ ok: true });
  }
};
export const listCompleted = async (req, res) => {
  try {
    const list = await Completed.findOne({
      user: req.auth._id,
      course: req.body.courseId,
    }).exec();

    list && res.json(list.lessons);
  } catch (err) {
    console.log(err);
  }
};

export const markIncomplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;
    console.log("request body", req);
    const updated = await Completed.findOneAndUpdate(
      {
        user: req.auth._id,
        course: courseId,
      },
      {
        $pull: { lessons: lessonId },
      }
    ).exec();
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
  }
};
