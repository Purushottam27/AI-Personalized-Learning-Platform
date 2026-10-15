import mongoose from "mongoose";

/** Execute a lifecycle mutation in a MongoDB transaction.
 * Transactions require a replica set or sharded MongoDB deployment.
 * withTransaction retries transient transaction failures according to the driver.
 */
export async function withTransaction(work) {
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            result = await work(session);
        });
        return result;
    } finally {
        await session.endSession();
    }
}
