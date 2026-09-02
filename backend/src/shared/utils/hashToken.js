import crypto from "crypto";

function hashToken(token){
    const tokenHash = crypto.createHash("sha256")
        .update(token)
        .digest("hex");
    
    return tokenHash
}

export {hashToken}