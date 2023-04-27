import excuteQuery from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"

export default async function handler(req, res) {
    const { roomId } = req.query
    const session = await getServerSession(req, res, authOptions)

    //Check for access
    let Access = false;
    if (session) {
        if (roomId == 1) {
            Access = true;
        } else {
            try {
                const result = await excuteQuery({
                    query: 'SELECT COUNT(1) AS nums FROM participant WHERE userid = (?) AND roomid = (?);',
                    values: [session.user.id, roomId]
                });
                if (result && JSON.parse(JSON.stringify(result[0]))['nums'] === 1) Access = true;
            } catch (error) {
                console.log(error);
                res.status(500).json([])
            }
        }
    }

    if (!isNaN(roomId) && Access) {
        try {
            const result = await excuteQuery({
                query: 'SELECT user.name, user.image FROM participant INNER JOIN user ON participant.userid = user.id WHERE participant.roomid = (?);',
                values: [roomId]
            });
            res.status(200).json(result)
        } catch (error) {
            console.log(error);
            res.status(500).json([])
        }
    } else {
        res.status(500).json([])
    }
}
