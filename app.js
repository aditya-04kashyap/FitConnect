const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb+srv://kashyap1aditya:e5ypk0Y9vaZea9ng@cluster0.w0lo1j3.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

const devoteeSchema = new mongoose.Schema({
  dvFName: String,
  dvEmail: String,
  dvPassword: String,
  dvCity: String,
  dvGender: String,
  dvCountry: String,
  dvTSleep: String,
  dvTWakeup: String,
  dvChant: String,
  dvTHear: String,
  dvTRead: String,
  dvTServ: String,
  dvTDRest: String,
  dvFriend: [String],
  dvCounselor: [String]
});

const sadhanaSchema = new mongoose.Schema({
  usId: mongoose.Schema.Types.ObjectId,
  date: String,
  score: Number,
  tSleep: String,
  tWakeup: String,
  tChant: String,
  chantMorn: String,
  chantRnd: String,
  chantQ: String,
  mangal: String,
  tHear: String,
  tRead: String,
  tService: String,
  tDayRest: String
});

const messageSchema = new mongoose.Schema({
  sndrName: String,
  rcvrId: mongoose.Schema.Types.ObjectId,
  date: { type: Date, default: Date.now },
  msg: String
});

const Devotee = mongoose.model('Devotee', devoteeSchema);
const Sadhana = mongoose.model('Sadhana', sadhanaSchema);
const Message = mongoose.model('Message', messageSchema);

// Routes
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const devotee = await Devotee.findOne({ dvEmail: email, dvPassword: password });
    if (devotee) {
      res.json('Login Successful');
    } else {
      res.json('No record');
    }
  } catch (error) {
    console.error(error);
    res.json('Error');
  }
});

app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const newDevotee = new Devotee({ dvFName: name, dvEmail: email, dvPassword: password });
    await newDevotee.save();
    res.json('Signup Successful');
  } catch (error) {
    console.error(error);
    res.json('Signup failed');
  }
});

app.post('/editProfile', async (req, res) => {
  try {
    const { email, city, gender, country, friends, counselors, sleepTime, wakeupTime, chant, hear, read, serv, mtw } = req.body;
    await Devotee.findOneAndUpdate({ dvEmail: email }, {
      dvCity: city, dvGender: gender, dvCountry: country, dvTSleep: sleepTime, dvTWakeup: wakeupTime, 
      dvChant: chant, dvTHear: hear, dvTRead: read, dvTServ: serv, dvTDRest: mtw
    });

    await updateFriendList(email, friends);
    await updateCounselorList(email, counselors);

    res.json('Profile updated successfully');
  } catch (error) {
    console.error(error);
    res.json('Failed to update profile');
  }
});

const updateFriendList = async (userEmail, friendEmails) => {
  const user = await Devotee.findOne({ dvEmail: userEmail });
  if (!user) return;

  user.dvFriend = friendEmails;
  await user.save();
};

const updateCounselorList = async (userEmail, counselorEmails) => {
  const user = await Devotee.findOne({ dvEmail: userEmail });
  if (!user) return;

  user.dvCounselor = counselorEmails;
  await user.save();
};

app.get('/friends/:userEmail', async (req, res) => {
  try {
    const userEmail = req.params.userEmail;
    const user = await Devotee.findOne({ dvEmail: userEmail });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const friendData = await Promise.all(user.dvFriend.map(async (friendEmail) => {
      const friend = await Devotee.findOne({ dvEmail: friendEmail });
      return { email: friendEmail, name: friend ? friend.dvFName : 'Unknown' };
    }));

    res.json(friendData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/friends/sadhana/:friendEmail', async (req, res) => {
  try {
    const friendEmail = req.params.friendEmail;
    const friend = await Devotee.findOne({ dvEmail: friendEmail });
    if (!friend) return res.status(404).json({ error: 'User ID not found for the given email' });

    const sadhanaRecords = await Sadhana.find({ usId: friend._id }).sort({ date: -1 });
    res.json(sadhanaRecords);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/counselors/:userEmail', async (req, res) => {
  try {
    const userEmail = req.params.userEmail;
    const user = await Devotee.findOne({ dvEmail: userEmail });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const counselorData = await Promise.all(user.dvCounselor.map(async (counselorEmail) => {
      const counselor = await Devotee.findOne({ dvEmail: counselorEmail });
      return { email: counselorEmail, name: counselor ? counselor.dvFName : 'Unknown' };
    }));

    res.json(counselorData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/send-message', async (req, res) => {
  try {
    const { senderName, receiverEmail, message } = req.body;
    const receiver = await Devotee.findOne({ dvEmail: receiverEmail });
    if (!receiver) return res.json('Receiver not found');

    const newMessage = new Message({ sndrName: senderName, rcvrId: receiver._id, msg: message });
    await newMessage.save();

    res.json('Message sent successfully');
  } catch (error) {
    console.error(error);
    res.json('Failed to send message');
  }
});

app.get('/received-messages/:userEmail', async (req, res) => {
  try {
    const userEmail = req.params.userEmail;
    const user = await Devotee.findOne({ dvEmail: userEmail });
    if (!user) return res.json('User not found');

    const messages = await Message.find({ rcvrId: user._id });
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/save-sadhana', async (req, res) => {
  try {
    const { userEmail, dateNumber, percentage, sleepTime, wakeupTime, chantComplete, chantMorning, chantRound, chantCount, chantQuality, mangalArti, hearAndThink, readAndThink, service, timeWaste } = req.body;
    const user = await Devotee.findOne({ dvEmail: userEmail });
    if (!user) return res.json('User not found');

    const newSadhana = new Sadhana({
      usId: user._id, date: dateNumber, score: percentage, tSleep: sleepTime, tWakeup: wakeupTime, tChant: chantComplete,
      chantMorn: chantMorning, chantRnd: chantRound, chantQ: chantQuality, mangal: mangalArti,
      tHear: hearAndThink, tRead: readAndThink, tService: service, tDayRest: timeWaste
    });

    await newSadhana.save();
    res.json('Sadhana data saved successfully');
  } catch (error) {
    console.error(error);
    res.json('Error saving Sadhana data');
  }
});

app.get('/get-sadhana-history/:userEmail', async (req, res) => {
  try {
    const userEmail = req.params.userEmail;
    const user = await Devotee.findOne({ dvEmail: userEmail });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sadhanaHistory = await Sadhana.find({ usId: user._id }).sort({ date: -1 });
    if (sadhanaHistory.length === 0) return res.status(404).json({ error: 'Sadhana history not found for the user' });

    res.json(sadhanaHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/delete-sadhana/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const result = await Sadhana.deleteOne({ date: date });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Sadhana record not found' });
    }

    res.json({ message: 'Sadhana record deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(8081, () => {
  console.log('Listening....');
});
