require('dotenv').config()
const express = require('express');
const _ = require('lodash');
const date = require(__dirname + '/date.js');

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

var port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGOOSE_CONNECTION);
const itemsSchema = new mongoose.Schema({
  name: String
});
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema],
  removedItems: [itemsSchema]
})

const Item = mongoose.model('Item', itemsSchema);
const RemovedItem = mongoose.model('RemovedItem', itemsSchema);
const List = mongoose.model('List', listSchema);

app.get('/', async (req, res) => {
  res.redirect('/Today');
});

app.get('/:lst', function (req, res) {
  const listName = _.startCase(_.toLower(req.params.lst));
  const day = date.getDate();

  List.findOne({ name: listName }, (err, foundList) => {
    if (!foundList) {
      const list = new List({
        name: listName,
      })
      list.save();
      res.redirect('/' + listName);
    } else {
      res.render('list', {
        day: day,
        listTitle: foundList.name,
        newListItems: foundList.items,
        oldListItems: foundList.removedItems
      });
    }
  })
});

app.post('/', (req, res) => {
  const listName = req.body.list;
  const itemName = req.body.newItem;
  if (listName === '') {
    res.redirect('/');
  } else {
    List.findOneAndUpdate(
      { name: listName },
      { $push: { items: { name: itemName } } },
      async (err, foundList) => {
        if (!foundList) {
          await addItem({ name: itemName });
          res.redirect('/');
        } else {
          res.redirect('/' + listName);
        }
      });
  }
});


app.post('/delete', (req, res) => {
  const listName = JSON.parse(req.body.checkDelete)[0];
  const targetItem = JSON.parse(req.body.checkDelete)[1];

  List.findOneAndUpdate(
    { name: listName },
    {
      $pull: { items: targetItem },
      $push: { removedItems: targetItem }
    },
    { new: true },
    async (err, foundList) => {
      if (!foundList) {
        Item.findOneAndDelete({ name: targetItem.name }, (err) => {
          if (err) { console.log(err); }
        });
        await removeItem(targetItem);
        res.redirect('/');
      } else {
        res.redirect('/' + listName);
      }
    });
});

app.post('/restore', (req, res) => {
  const listName = JSON.parse(req.body.checkRestore)[0];
  const targetItem = JSON.parse(req.body.checkRestore)[1];

  List.findOneAndUpdate(
    { name: listName },
    {
      $pull: { removedItems: targetItem },
      $push: { items: targetItem }
    },
    { new: true },
    async (err, foundList) => {
      if (!foundList) {
        RemovedItem.findOneAndDelete({ name: targetItem.name }, (err) => {
          if (err) { console.log(err); }
        });
        await addItem(targetItem);
        res.redirect('/');
      } else {
        res.redirect('/' + listName);
      }
    });
});

app.get('/about', function (req, res) {
  res.render('about');
});

app.listen(port, function () {
  console.log(`Server started on port ${port}`);
});

async function addItem(item) {
  let newItem = await new Item(item);
  newItem.save();
}

async function removeItem(item) {
  let newItem = await new RemovedItem(item);
  newItem.save();
}