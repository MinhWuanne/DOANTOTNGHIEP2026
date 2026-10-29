
import {
    ReturnStatus,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../../lib/prisma.js";
import {
    returnService,
} from "../../return/return.service.js";


export class AdminReturnService {
    // ============================================================
    // GET RETURN REQUESTS
    //
    // ADMIN có thể:
    // - Xem danh sách yêu cầu trả hàng.
    // - Lọc theo trạng thái.
    // - Theo dõi thông tin đơn hàng và người mua.
    //
    // Mặc định sắp xếp yêu cầu mới nhất trước.
    // Chỉ đọc dữ liệu, không thay đổi nghiệp vụ.
    // ============================================================
    async getReturnRequests(
        status?: ReturnStatus,
    ) {
        return prisma.returnRequest.findMany({
            where: status
                ? {
                    status,
                }
                : undefined,

            orderBy: {
                requestedAt: "desc",
            },

            include: {
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true,
                        paymentStatus: true,
                        paymentMethod: true,
                        subtotal: true,
                        shippingFee: true,
                        discount: true,
                        totalAmount: true,
                        createdAt: true,
                        deliveredAt: true,

                        account: {
                            select: {
                                id: true,
                                platform: true,

                                person: {
                                    select: {
                                        fullName: true,
                                        email: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    // ============================================================
    // GET RETURN REQUEST BY ID
    //
    // Tái sử dụng ReturnService hiện tại để lấy:
    // - Thông tin yêu cầu trả hàng.
    // - Thông tin người mua và đơn hàng.
    // - Danh sách sản phẩm.
    // - Thông tin hoa hồng liên quan.
    //
    // Không viết lại logic truy vấn chi tiết.
    // ============================================================
    async getReturnRequestById(
        id: bigint | number,
    ) {
        return returnService.getReturnRequestById(id);
    }


    async approveReturn(
        id: bigint | number,
    ) {
        return returnService.approveReturn(id);
    }

    async rejectReturn(
        id: bigint | number,
        note?: string,
    ) {
        return returnService.rejectReturn(
            id,
            note,
        );
    }

}

export const adminReturnService =
    new AdminReturnService();
