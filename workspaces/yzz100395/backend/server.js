const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDatabase } = require('./database/db');
const sampleRoutes = require('./routes/samples');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', sampleRoutes);

app.use(express.static('public'));

initDatabase();

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});