const express = require("express");
const app = express();
const cookuserModel = require("./models/cookuser");
const userModel = require("./models/user");
const upload = require("./config/multer-config");
const postModel = require("./models/post");
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session and Flash
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
app.use(flash());

// Connect to Database
const connectToDb = require("./config/mongoose-connector");
connectToDb();

// Set View Engine
app.set("view engine", "ejs");

// Routes
app.get("/", function (req, res) {
  res.render("main");
});

// Cook Routes
app.get("/cookRegister", function (req, res) {
  res.render("cookRegister");
});

app.post("/cookRegister", async function (req, res) {
  let { name, email, password,location } = req.body;

  try {
    let createdCookUser = await cookuserModel.findOne({ email });

    if (createdCookUser) {
      req.flash("error_msg", "Your account already exists. Please login.");
      return res.redirect("/cookRegister");
    }
   // authentication
    bcrypt.genSalt(10, function (err, salt) {
      bcrypt.hash(password, salt, async function (err, hash) {
        createdCookUser = await cookuserModel.create({
          name,
          email,
          password: hash,
          location
        });

        let token = jwt.sign({ email }, "secret");
        res.cookie("token", token);
        req.flash("success_msg", "Registration successful! Please login.");
        res.redirect("/cookLogin");
      });
    });
  } catch (err) {
    req.flash("error_msg", "Registration failed. Please try again.");
    res.redirect("/cookRegister");
  }
});

app.get("/cookLogin", function (req, res) {
  res.render("cookLogin");
});

app.post("/cookLogin", async function (req, res) {
  let user = await cookuserModel.findOne({ email: req.body.email });
  if (!user) {
    req.flash("error_msg", "Invalid email or password.");
    return res.redirect("/cookLogin");
  }

  bcrypt.compare(req.body.password, user.password, function (err, result) {
    if (result) {
      let token = jwt.sign({ email: user.email }, "secret");
      res.cookie("token", token);
      res.redirect("/cookDashboard");
    } else {
      req.flash("error_msg", "Invalid email or password.");
      res.redirect("/cookLogin");
    }
  });
});

// User Routes
app.get("/userRegister", function (req, res) {
  res.render("userRegister");
});

app.post("/userRegister", async function (req, res) {
  let { name, email, password ,location} = req.body;

  try {
    let createdUser = await userModel.findOne({ email });

    if (createdUser) {
      req.flash("error_msg", "Your account already exists. Please login.");
      return res.redirect("/userRegister");
    }

    bcrypt.genSalt(10, function (err, salt) {
      bcrypt.hash(password, salt, async function (err, hash) {
        createdUser = await userModel.create({
          name,
          email,
          password: hash,
          location,
        });

        let token = jwt.sign({ email }, "secret");
        res.cookie("token", token);
        req.flash("success_msg", "Registration successful! Please login.");
        res.redirect("/userLogin");
      });
    });
  } catch (err) {
    req.flash("error_msg", "Registration failed. Please try again.");
    res.redirect("/userRegister");
  }
});

app.get("/userLogin", function (req, res) {
  res.render("userLogin");
});

app.post("/userLogin", async function (req, res) {
  let user = await userModel.findOne({ email: req.body.email });
  if (!user) {
    req.flash("error_msg", "Invalid email or password.");
    return res.redirect("/userLogin");
  }

  bcrypt.compare(req.body.password, user.password, function (err, result) {
    if (result) {
      let token = jwt.sign({ email: user.email }, "secret");
      res.cookie("token", token);
      res.redirect("/home");
    } else {
      req.flash("error_msg", "Invalid email or password.");
      res.redirect("/userLogin");
    }
  });
});

// Logout Route
app.get("/logout", function (req, res) {
  res.cookie("token", "");
  res.redirect("/");
});

// Protected Routes
function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    req.flash("error_msg", "Please log in to access this page.");
    return res.redirect("/cookLogin");
  }

  try {
    const data = jwt.verify(token, "secret");
    req.user = data;
    next();
  } catch (err) {
    req.flash("error_msg", "Invalid token. Please log in again.");
    res.redirect("/cookLogin");
  }
}

app.get("/cookDashboard", isLoggedIn, async (req, res) => {
  let user = await cookuserModel.findOne({ email: req.user.email });
  // let user1 = await userModel.findOne({ email: req.user.email }).populate("cart");
  
  // ,orders:user1.cart ,user1
  res.render("cookDashboard", { user});
});

// Home Page
app.get("/home",isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ email: req.user.email });
    // Handle case where user doesn't exist
    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/login"); // Redirect to login or error page
    }
  let post = await postModel.find({});
  const posts = await postModel.find({ location: user.location });
 
  res.render("home", {
    posts,
    post,
    userLocation: user.location   // <-- Pass user location separately
  });
});

// Add Order to Cart
app.get("/addOrder/:postid", isLoggedIn, async function (req, res) {
  try {
    const postId = req.params.postid;

    // Check if postid is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      req.flash("error_msg", "Invalid post ID.");
      return res.redirect("/home");
    }

    // Find the user
    let user = await userModel.findOne({ email: req.user.email });
    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/home");
    }

    // Add the post ID to the user's cart
    user.cart.push(postId);
    await user.save();

    req.flash("success_msg", "Post added to cart successfully.");
    res.redirect("/home");
  } catch (err) {
    console.error("Error:", err);
    req.flash("error_msg", "Failed to add post to cart.");
    res.redirect("/home");
  }
});

// View Orders
app.get("/order", isLoggedIn, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email }).populate("cart");
    console.log("Searching for user with email:", req.user.email);
    res.render("order", { orders: user.cart });
  } catch (err) {
    console.error("Error:", err);
    req.flash("error_msg", "Failed to fetch orders.");
    res.redirect("/home");
  }
});


// Remove Order from Cart
app.get("/removeFromCart/:itemId", isLoggedIn, async function (req, res) {
  try {
    const itemId = req.params.itemId;

    // Debug: Check req.user
    console.log("User from request:", req.user);

    // Find the user
    let user = await userModel.findOne({ email: req.user.email });
    if (!user) {
      req.flash("error_msg", "User not found. Please log in again.");
      return res.redirect("/login");
    }

    // Debug: Check user.cart
    console.log("User cart before removal:", user.cart);

    // Ensure cart exists
    if (!user.cart) {
      user.cart = [];
    }

    // Remove the item from the cart
    user.cart = user.cart.filter((cartItemId) => cartItemId.toString() !== itemId);

    // Debug: Check user.cart after removal
    console.log("User cart after removal:", user.cart);

    await user.save();

    req.flash("success_msg", "Item removed from cart successfully.");
    res.redirect("/order");
  } catch (err) {
    console.error("Error:", err);
    req.flash("error_msg", "Failed to remove item from cart.");
    res.redirect("/order");
  }
});

// Create Post
app.get("/createPost",function (req, res) {
  res.render("createPost");
});

app.post("/createPost",isLoggedIn, upload.single("image"), async function (req, res) {
  try {
    let { name,cookname,speciality,price,description,location,contact } = req.body;
    
    let post = await postModel.create({
      image: req.file.buffer,
      name,
      cookname,
      speciality,
      price,
      description,
      location,
      contact,
      
    });
   
    req.flash("success_msg", "Post created successfully.");
    res.redirect("/createPost");
  } catch (err) {
    console.error("Error:", err);
    req.flash("error_msg", "Failed to create post.");
    res.redirect("/createPost");
  }
});


//received order
app.get("/receivedOrders", isLoggedIn, async function (req, res) {
  try {
    // Find the logged-in cook
    const cook = await cookuserModel.findOne({ email: req.user.email });
    if (!cook) {
      req.flash("error_msg", "Cook not found.");
      return res.redirect("/cookDashboard");
    }

    // Find all posts created by this cook
    const posts = await postModel.find({ cookId: cook._id });

    // Find all users who have added these posts to their cart
    const usersWithOrders = await userModel.find({ cart: { $in: posts.map(post => post._id) } }).populate('cart');

    // Extract the orders (posts) from the users' carts
    const receivedOrders = usersWithOrders.flatMap(user => 
      user.cart.filter(post => post.cookId.equals(cook._id))
    );

    // Debugging: Log the received orders
    console.log("Received Orders:", receivedOrders);

    res.render("receivedOrders", { orders: receivedOrders });
  } catch (err) {
    console.error("Error:", err);
    req.flash("error_msg", "Failed to fetch received orders.");
    res.redirect("/cookDashboard");
  }
});


//from here cook will see received order
app.get("/cookorder", isLoggedIn, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email }).populate("cart");
    let user1 = await userModel.findOne({ email: req.user.email });
  
    res.render("cookorder", { orders: user.cart ,user1});
  } catch (err) {
    console.error("Error:", err);
    req.flash("error_msg", "Failed to fetch orders.");
    res.redirect("/home");
  }
});

//profile of cook
app.get("/profile",(req,res)=>{
  res.render("profile")
})
//publec profile
app.get("/publicprofile",async (req,res)=>{
  const cook = await cookuserModel.findOne({ email: req.email });
  console.log(cook);
  
  res.render("publicprofile",{cook})
})

//cook public profile 
app.get("/cookpublicprofile/:postid",isLoggedIn,async(req,res)=>{
  try {
    const postId = req.params.postid;
  //  console.log("Post ID:", postId); // Debugging line
  
    // Fetch the post using the post ID
    const post = await postModel.findById(postId) // Assuming 'user' refers to the cook (User)
    if (!post) {
        return res.status(404).send('Post not found');
    }

 
    // Render the cook's profile page with post and cook details
    res.render('cookPublicProfile', {
        post: post
    });
} catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
}
})

//homemaker profile 
app.post("/profile",async(req,res)=>{

});
//
app.get("/cookhome",isLoggedIn, async function (req, res) {
  
  let post = await postModel.find({});
 
 
  res.render("cookhome", {
        post,
  });
});



// Start Server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
