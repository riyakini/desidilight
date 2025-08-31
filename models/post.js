const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  image: { 
    type: Buffer, 
  },
  name: { 
    type: String, 
    required: true 
  }, 
  cookname:{
    type: String, 
    required: true 
  },
  speciality:{
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
  }, 
  description:{ 
    type: String, 
    
  }, 
  location: { 
    type: String, 
    
  }, 
  contact:{
    type: String, 
  },
  createdAt: { 
     type: Date, 
     default: Date.now 
    }, 
 });

module.exports = mongoose.model('post', postSchema);