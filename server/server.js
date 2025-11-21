const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const app = express();

app.use(express.json());
app.use(cors());

// Function to load CSV Files into a Grid Format.




// Static Loading.
app.use('/', express.static('client'));

app.use('/', (req, res) => {
    res.sendFile('index.html', { root: 'client' });
});

app.listen(port, () => {
    console.log('Listening on port ' + port);
});