import excuteQuery from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth/[...nextauth]"

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions)

    //Check for access
    if (session.user) {
        try {
            const result = await excuteQuery({
                query: 'SELECT invitation.id AS inv_id, user.email AS inv_email, user.name AS inv_name, room.name AS name, room.type AS type FROM invitation INNER JOIN room ON invitation.roomid = room.roomid INNER JOIN user ON invitation.inv_userid = user.id WHERE invitation.rec_userid = (?);',
                values: [session.user.id]
            });
            res.status(200).json(result)
        } catch (error) {
            console.log(error);
            res.status(500).json([])
        }
    }
    else {
        res.status(500).json([])
    }
}
