import User from "../models/user";
import { nanoid } from "nanoid";
import { hashPassword } from "../utils/auth";
import { comparePassword } from "../utils/auth";
import jwt from "jsonwebtoken";
import AWS from "aws-sdk";

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
};
const SES = new AWS.SES(awsConfig);

export const register = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();
    // validation

    if (!name) {
      return res.status(400).send("Name is required");
    }
    if (!password || password.length < 6) {
      return res
        .status(400)
        .send("Password required and should be min 6 characters long");
    }
    let userExist = await User.findOne({ email }).exec();
    if (userExist) {
      return res.status(400).send("Email is taken");
    }
    // hash password
    const hashedPassword = await hashPassword(password);
    //register

    const user = await new User({
      name: name,
      email: email,
      password: hashedPassword,
    }).save();

    //  await user.save();

    console.log("saved user", user);

    return res.json({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(400).send("Error ,Try again");
  }
};

export const login = async (req, res) => {
  try {
    console.log(req.body);
    //take user pass and check with db
    const { email, password } = req.body;
    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(400).send("No User Found");

    const isEqual = await comparePassword(password, user.password);
    if (!isEqual) return res.status(400).send("Wrong Password");
    //create signed jwt
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log({ token });
    console.log(user._id);
    // return user and token to client,exclude hashed password

    user.password = undefined;
    // send tokden in cookie

    res.cookie("token", token, {
      httpOnly: true,
      //  secure:true, //only works on https
    });

    //send user as json response
    res.json(user);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Error ,try again");
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.json({ message: "SignOut Success" });
  } catch (err) {
    console.log(err);
  }
};

export const currentUser = async (req, res) => {
  try {
    const user = await User.findById(req.auth._id).select("-password").exec();
    console.log("CURRENT_USER", user);
    //  return res.json(1);
    return res.json({ ok: true });
  } catch (err) {
    console.log(err);
  }
};

export const sendTestEmail = async (req, res) => {
  // console.log("send email using ses")
  // res.json({ok:true});
  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: {
      ToAddresses: ["shubhampanchal9900@gmail.com"],
    },

    ReplyToAddresses: [process.env.EMAIL_FROM],
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: ` <html>
         <h1>shubham panchal reset password link </h1>
         <p> adsfoa</p>
         </html>
       `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "password reset link",
      },
    },
  };
  const emailSent = SES.sendEmail(params).promise();
  emailSent
    .then((data) => {
      console.log(data);
      res.json({ ok: true });
    })
    .catch((err) => {
      console.log(err);
    });
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const shortCode = nanoid(6).toUpperCase();
    const user = await User.findOneAndUpdate(
      { email },
      { passwordResetCode: shortCode }
    );
    if (!user) return res.status(400).send("user not found");

    const params = {
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: [email],
      },
      // ReplyToAddresses: [process.env.EMAIL_FROM],

      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `<html>
                     <h1>Reset Password</h1>
                      <p> Use this code to reset your password</p>
                      <h2 style ="color:red;">${shortCode}</h2>
                      <i>learnmyway.in</i>
                     </html>`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Reset Password",
        },
      },
    };
    const emailSent = SES.sendEmail(params).promise();
    emailSent
      .then((data) => {
        console.log(data);
        res.json({ ok: true });
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (error) {
    console.log(err);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    console.table({ email, code, newPassword });

    const hashedPassword = await hashPassword(newPassword);
    const user = User.findOneAndUpdate(
      {
        email,
        passwordResetCode: code,
      },
      { password: hashedPassword, passwordResetCode: "" }
    ).exec();

    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(400).send("Error Try again");
  }
};
