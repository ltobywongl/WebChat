import excuteQuery from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth/[...nextauth]"

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions)

    if (session) {
        try {
            const result = await excuteQuery({
                query: 'SELECT participant.roomid, room.name, room.type FROM participant INNER JOIN room ON participant.roomid = room.roomid WHERE participant.userid = (?);',
                values: [session.user.id]
            });
            res.status(200).json(result)
        } catch (error) {
            console.log(error);
            res.status(500).json([{}])
        }
    } else {
        res.status(500).json([{}])
    }
}
