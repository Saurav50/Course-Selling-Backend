const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors=require('cors');
const app = express();
app.use(cors())

app.use(express.json());
app.use(bodyParser.json());

//mongoose schemas
const userSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
});

const adminSchema = new mongoose.Schema({ username: String, password: String });
const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageLink: String,
  published: Boolean,
});

// Define mongoose models
const User = mongoose.model("User", userSchema);
const Admin = mongoose.model("Admin", adminSchema);
const Course = mongoose.model("Course", courseSchema);

// mongoDb Connection
mongoose.connect(
  "mongodb+srv://mastersaurav50:qx2oi59tGw8IWRe4@cluster0.gebeag2.mongodb.net/courses",
  { useNewUrlParser: true, useUnifiedTopology: true, dbName: "courses" }
);

// json web token generate
const secretKey = "Super97Secr68et"; // replace this with your own secret key

// Authenticate json web tokens
const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    console.log(token);

    jwt.verify(token, secretKey, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      console.log(user);

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Admin routes
app.post("/admin/signup", async (req, res) => {
  // logic to sign up admin
  const { username, password } = req.body;
  if (!username || !password)
    res
      .status(400)
      .json({ message: "Please provide both username and password" });
  else {
    // check for existing admin username
    const admin = await Admin.findOne({ username });
    if (admin)
      res.status(400).json({
        message: "Admin already exists",
      });
    else {
      const newAdmin = new Admin({
        username: username,
        password: password,
      });
      newAdmin.save();
      //   jwt token generate;
      const token = jwt.sign({ username, role: "admin" }, secretKey, {
        expiresIn: "1h",
      });
      res.json({ message: "Admin created successfully", token });
    }
  }
});

app.post("/admin/login", async (req, res) => {
  // logic to log in admin
  const { username, password } = req.headers;
  // check for valid combination of admin username and password exists
  const admin = await Admin.findOne({ username, password });
  if (!admin) {
    return res.status(401).json("Invalid Username or Password");
  } else {
    // create a JWT token
    const token = jwt.sign({ username, role: "admin" }, secretKey, {
      expiresIn: "1h",
    });
    res.json({ message: "Logged in successfully", token });
  }
});

app.post("/admin/courses", authenticateJwt, async (req, res) => {
  // logic to create a course
  const courserDetails = req.body;
  //   check for already existing course
  const course = await Course.findOne({ title: courserDetails.title });
  if (course) {
    return res.status(409).json({ message: "Course already exists" });
  } else {
    const newCourse = new Course(courserDetails);
    newCourse.save();
    res.json({ message: "Course added Successfully!" });
  }
});

// app.put("/admin/courses/:courseId", authenticateJwt, async (req, res) => {
//   // logic to edit a course
//   const id = req.params.courseId;
//   const course = await Course.findByIdAndUpdate(id, req.body, {
//     new: true,
//   });
//   if (course) res.json({ message: `The course with the id ${id} has updated` });
//   else res.status(404).json({ message: "No such course found" });
// });
app.put("/admin/courses/:courseId", authenticateJwt, async (req, res) => {
  try {
    const id = req.params.courseId;
    const course = await Course.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (course) {

      res.json({ message: `The course with the id ${id} has been updated` ,updatedCourse:course});
    } else {
      res.status(404).json({ message: "No such course found" });
    }
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/admin/courses", authenticateJwt, async (req, res) => {
  // logic to get all courses
  const courses = await Course.find({});
  res.json({
    courses,
  });
});

// User routes
app.post("/users/signup", async (req, res) => {
  // logic to sign up user
  const { username, password } = req.body;
  if (!username || !password)
    res
      .status(400)
      .json({ message: "Please provide both username and password" });
  else {
    // check for existing user username
    const user = await User.findOne({ username });
    if (user)
      res.status(400).json({
        message: "User already exists",
      });
    else {
      const newUser = new User({
        username: username,
        password: password,
      });
      newUser.save();
      //   jwt token generate;
      const token = jwt.sign({ username, role: "user" }, secretKey, {
        expiresIn: "1h",
      });
      res.json({ message: "User created successfully", token });
    }
  }
});

app.post("/users/login", async (req, res) => {
  // logic to log in user
  const { username, password } = req.headers;
  // check for valid combination of user username and password exists
  const user = await User.findOne({ username, password });
  if (!user) {
    return res.status(401).json("Invalid Username or Password");
  } else {
    // create a JWT token
    const token = jwt.sign({ username, role: "user" }, secretKey, {
      expiresIn: "1h",
    });
    res.json({ message: "Logged in successfully", token });
  }
});

app.get("/users/courses", authenticateJwt, async (req, res) => {
  // logic to list all courses
  const courses = await Course.find({ published: true });
  res.json({
    courses,
  });
});

app.post("/users/courses/:courseId", authenticateJwt, async (req, res) => {
  // logic to purchase a course
  const { courseId } = req.params;
  const user = await User.findOne({ username: req.user.username });
  if (!user) {
    return res.status(403).json({
      message: "You are not logged in!",
    });
  } else {
    // get course details from COURSE
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    } else {
      // check if already user has purchased or not
      const alreadyPurchased = user.purchasedCourses.find((course) => {
        return String(course._id) === String(courseId);
      });
      if (alreadyPurchased) {
        return res
          .status(409)
          .json({ message: "User already owns this course!" });
      } else {
        user.purchasedCourses.push(course);
        user.save();
        res.json({
          message: `Successfully purchased ${course.title}`,
        });
      }
    }
  }
});

app.get("/users/purchasedCourses", authenticateJwt, async (req, res) => {
  // logic to view purchased courses
  const user = await User.findOne({ username: req.user.username }).populate(
    "purchasedCourses"
  );
  if (user) {
    res.json({ purchasedCourses: user.purchasedCourses || [] });
  } else {
    res.status(403).json({ message: "User not found" });
  }
});

app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});