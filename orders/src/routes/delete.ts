import express, { Request, Response } from "express"
import { NotAuthorizedError, NotFoundError, OrderStatus } from "../../lib"
import { OrderCancelledPublisher } from "../events/publishers/order-cancelled-publisher"
import { Order } from "../models"
import { natsWrapper } from "../nats-wrapper"

const router = express.Router()

router.delete(
  "/api/orders/:orderId",
  async (req: Request, res: Response) => {
    const { orderId } = req.params

    const order = await Order.findById(orderId).populate("ticket")
    if (!order)
      throw new NotFoundError()

    if (order.userId !== req.user!.id)
      throw new NotAuthorizedError()

    order.status = OrderStatus.CANCELLED
    await order.save()

    await new OrderCancelledPublisher(natsWrapper.client).publish({
      id: order.id,
      version: order.version,
      ticket: {
        id: order.ticket.id
      }
    })

    res.status(204).send(order)
  }
)

export { router as deleteOrderRouter }

