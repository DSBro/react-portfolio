const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

// @route   GET api/auth
// @desc    Test route
// @access  Public

// auth param in this get request ensures that auth route is protected
router.get('/', auth, async (req, res) => {
  try {
    // Pull User by ID and remove password from package
    const user = await User.findById(req.user.id).select('-password')
  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth
// @desc    Authenticate user & get token
// @access  Public
router.post('/',
  [
    check(
      'email', 'Please include a valid email')
      .isEmail(),
    check(
      'password','Password is required')
      .exists()
],
async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // destructures request.body to pull relevant information
  const { email, password } = req.body;

  /*
  Waits for user to enter in email and then checks to see whether that user 
  exists in the DB. If no email is entered, "Invalid Credentials" returned.
  
  */
  try {
    let user = await User.findOne({ email });

    // See if user exists
    if(!user) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'Invalid Credentials'}] });
    }

    // first param is plaintext entered by user.
    // second param is encrypted password from MongoDB
    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'Invalid Credentials '}] });
    }

    const payload = {
      user: {
        // mongoose abstraction. MongoDB uses _.id by default
        id: user.id
      }
    };
    
    // sign the jsonwebtoken payload
    jwt.sign(
      payload,
      config.get('jwtSecret'),
      // set the token to expire in 1hr
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        // returns token from callback function
        res.json({ token });
      }
    );

  } catch(err) {
      console.error(err.message);
      res.status(500).send('Server error');
  }
});



module.exports = router;