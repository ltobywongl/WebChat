import excuteQuery from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"

export default async function handler(req, res) {
    const { invId } = req.query
    const session = await getServerSession(req, res, authOptions)

    //Check for access
    let Access = false;
    if (!isNaN(invId) && session.user) {
        try {
            const result = await excuteQuery({
                query: 'SELECT COUNT(1) AS nums FROM invitation WHERE rec_userid = (?) AND id = (?);',
                values: [session.user.id, invId]
            });
            if (result && JSON.parse(JSON.stringify(result[0]))['nums'] === 1) Access = true;
        } catch (error) {
            console.log(error);
            res.status(500).json([{}])
        }
    }

    if (!isNaN(invId) && Access) {
        try {
            await excuteQuery({
                query: 'DELETE FROM invitation WHERE id = (?);',
                values: [invId]
            });
            res.status(200).json([])
        } catch (error) {
            console.log(error);
            res.status(500).json([])
        }
    } else {
        res.status(500).json([])
    }
}
