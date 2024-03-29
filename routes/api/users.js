const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

// "up two levels" to
const User = require('../../models/User');

// @route   POST api/users
// @desc    Register user
// @access  Public
router.post('/',
  [
    check(
      'name', 'Name is required')
      .not()
      .isEmpty(),
    check(
      'email', 'Please include a valid email')
      .isEmail(),
    check(
      'password','Please enter a password with 6 or more characters')
      .isLength({ min: 6 })
],
async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // destructures request.body to pull relevant information
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    // See if user exists
    if(user) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'User already exists'}] });
    }

    // Get users gravatar
    const avatar = gravatar.url(email, {
      // size: 200
      s: '200',
      // rating: pg - no naked people
      r: 'pg',
      // default: mystery man
      d: 'mm'
    })

    user = new User({
      name,
      email,
      avatar,
      password
    });

    // First salt, then encrypt password
    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(password, salt);

    await user.save();

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
        res.json({ token });
      }
    );

  } catch(err) {
      console.error(err.message);
      res.status(500).send('Server error');
  }
});

module.exports = router;