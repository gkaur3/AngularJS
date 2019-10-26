
exports.deleteMessage = function(req,res){
    var id = req.params.id;
    messages.findOneAndRemove({"_id":id}, function(err){
        if(err){
            res.status(400).send("error occured while deleting the message"+ err.message);
        }
        else{
            res.status(200).send("message deleted successfully");
        }
    })
}


