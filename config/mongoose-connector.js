const mongoose=require("mongoose");

const connectDb=async()=>{
  try{
    await mongoose.connect(`mongodb://localhost:27017/dilite`);
    console.log("database connected");
  }catch(err){
    console.error("Database connection error :"+err);
    process.exit(1);
  }
};

module.exports=connectDb;