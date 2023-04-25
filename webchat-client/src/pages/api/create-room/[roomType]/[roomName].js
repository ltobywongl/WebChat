import excuteQuery from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"

export default async function handler(req, res) {
    const { roomType, roomName } = req.query
    const session = await getServerSession(req, res, authOptions)

    if (session) {
        try {
            const result = await excuteQuery({
                query: `INSERT INTO room (name, type) VALUES ((?), (?));`,
                values: [roomName, roomType]
            });
            console.log(result)
            await excuteQuery({
                query: `INSERT INTO participant (userid, roomid) VALUES ((?), (?));`,
                values: [session.user.id, result.insertId]
            });
            res.status(200).json({roomid: result.insertId, name: roomName, type: roomType})
        } catch (error) {
            console.log(error);
            res.status(500).json({})
        }
    } else {
        res.status(500).json({})
    }


}
