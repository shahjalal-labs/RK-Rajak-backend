# 📁 Project Structure

```bash
.
├── bun.lock
├── ecosystem.config.js
├── module.js
├── package.json
├── package-lock.json
├── prisma
│   └── schema.prisma
├── public
│   ├── index.html
│   ├── index.js
│   └── README.md
├── README.md
├── src
│   ├── app
│   │   ├── builder
│   │   │   └── QueryBuilder.ts
│   │   ├── constant
│   │   │   └── index.ts
│   │   ├── DB
│   │   │   └── index.ts
│   │   ├── interfaces
│   │   │   ├── common.ts
│   │   │   └── file.ts
│   │   ├── middlewares
│   │   │   ├── auth.ts
│   │   │   ├── globalErrorHandler.ts
│   │   │   ├── optionalAuth.ts
│   │   │   ├── parseBodyData.ts
│   │   │   ├── postman.ts
│   │   │   ├── rateLimiter
│   │   │   └── validateRequest.ts
│   │   ├── modules
│   │   │   ├── auth
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.helpers.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.validation.ts
│   │   │   ├── banner
│   │   │   │   ├── banner.controller.ts
│   │   │   │   ├── banner.routes.ts
│   │   │   │   ├── banner.service.ts
│   │   │   │   └── banner.validation.ts
│   │   │   ├── branch
│   │   │   │   ├── branch.controller.ts
│   │   │   │   ├── branch.routes.ts
│   │   │   │   ├── branch.service.ts
│   │   │   │   └── branch.validation.ts
│   │   │   ├── cartvalue
│   │   │   │   ├── cartValue.controller.ts
│   │   │   │   ├── cartValue.routes.ts
│   │   │   │   ├── cartValue.service.ts
│   │   │   │   └── cartValue.validation.ts
│   │   │   ├── contact
│   │   │   │   ├── contact.controller.ts
│   │   │   │   ├── contact.routes.ts
│   │   │   │   ├── contact.service.ts
│   │   │   │   └── contact.validation.ts
│   │   │   ├── handalingcharge
│   │   │   │   ├── handalingCharge.controller.ts
│   │   │   │   ├── handalingCharge.routes.ts
│   │   │   │   ├── handalingCharge.service.ts
│   │   │   │   └── handalingCharge.validation.ts
│   │   │   ├── incentives
│   │   │   │   ├── incentives.controller.ts
│   │   │   │   ├── incentives.helper.ts
│   │   │   │   ├── incentives.routes.ts
│   │   │   │   ├── incentives.service.ts
│   │   │   │   ├── incentives.validation.ts
│   │   │   │   ├── INTEGRATION_EXAMPLE.md
│   │   │   │   └── README.md
│   │   │   ├── livephoto
│   │   │   │   ├── livePhoto.controller.ts
│   │   │   │   ├── livePhoto.routes.ts
│   │   │   │   ├── livePhoto.service.ts
│   │   │   │   └── livePhoto.validation.ts
│   │   │   ├── livephotocategory
│   │   │   │   ├── livePhotoCategory.controller.ts
│   │   │   │   ├── livePhotoCategory.routes.ts
│   │   │   │   ├── livePhotoCategory.service.ts
│   │   │   │   └── livePhotoCategory.validation.ts
│   │   │   ├── notifications
│   │   │   │   ├── notification.controller.ts
│   │   │   │   ├── notification.route.ts
│   │   │   │   └── notification.services.ts
│   │   │   ├── order
│   │   │   │   ├── order.controller.ts
│   │   │   │   ├── order.helpers.ts
│   │   │   │   ├── order.interface.ts
│   │   │   │   ├── order.routes.ts
│   │   │   │   ├── order.service.ts
│   │   │   │   ├── order.test.ts
│   │   │   │   └── order.validation.ts
│   │   │   ├── owner
│   │   │   │   ├── owner.controller.ts
│   │   │   │   ├── owner.routes.ts
│   │   │   │   ├── owner.service.ts
│   │   │   │   └── owner.validation.ts
│   │   │   ├── payment
│   │   │   │   ├── payment.controller.ts
│   │   │   │   ├── payment.interface.ts
│   │   │   │   ├── payment.routes.ts
│   │   │   │   └── payment.service.ts
│   │   │   ├── product
│   │   │   │   ├── const.ts
│   │   │   │   ├── product.controller.ts
│   │   │   │   ├── product.routes.ts
│   │   │   │   ├── product.service.ts
│   │   │   │   └── product.validation.ts
│   │   │   ├── productcategory
│   │   │   │   ├── productCategory.controller.ts
│   │   │   │   ├── productCategory.routes.ts
│   │   │   │   ├── productCategory.service.ts
│   │   │   │   └── productCategory.validation.ts
│   │   │   ├── review
│   │   │   │   ├── review.controller.ts
│   │   │   │   ├── review.routes.ts
│   │   │   │   ├── review.service.ts
│   │   │   │   └── review.validation.ts
│   │   │   ├── shippingaddress
│   │   │   │   ├── shippingAddress.controller.ts
│   │   │   │   ├── shippingAddress.routes.ts
│   │   │   │   ├── shippingAddress.service.ts
│   │   │   │   └── shippingAddress.validation.ts
│   │   │   ├── socket
│   │   │   │   └── socket.ts
│   │   │   ├── spin
│   │   │   │   ├── spin.controller.ts
│   │   │   │   ├── spin.routes.ts
│   │   │   │   ├── spin.service.ts
│   │   │   │   └── spin.validation.ts
│   │   │   ├── user
│   │   │   │   ├── user.const.ts
│   │   │   │   ├── user.controller.ts
│   │   │   │   ├── user.route.ts
│   │   │   │   ├── user.services.ts
│   │   │   │   └── user.validation.ts
│   │   │   └── wallet
│   │   │       ├── Wallet.controller.ts
│   │   │       ├── Wallet.routes.ts
│   │   │       ├── Wallet.service.ts
│   │   │       └── Wallet.validation.ts
│   │   └── routes
│   │       └── index.ts
│   ├── app.ts
│   ├── bullBoard.ts
│   ├── config
│   │   ├── index.ts
│   │   ├── serviceAccount.ts
│   │   └── viewRoutes.ts
│   ├── cron
│   │   └── incentives.cron.ts
│   ├── errors
│   │   ├── ApiErrors.ts
│   │   ├── handleClientError.ts
│   │   ├── handleValidationError.ts
│   │   ├── handleZodError.ts
│   │   └── parsePrismaValidationError.ts
│   ├── helpers
│   │   ├── fileUploader.ts
│   │   ├── fileUploadHelper.ts
│   │   ├── generateOtp.ts
│   │   ├── getModelKeys.ts
│   │   ├── haversineDistance.ts
│   │   ├── jwtHelpers.ts
│   │   ├── prismaEvreyWhere.ts
│   │   ├── radis.ts
│   │   ├── sendEmail.ts
│   │   ├── twofactor.ts
│   │   └── uploadToAWSS3.ts
│   ├── interfaces
│   │   ├── common.ts
│   │   ├── error.ts
│   │   ├── file.ts
│   │   ├── index.d.ts
│   │   └── paginations.ts
│   ├── queue
│   │   └── email.queue.ts
│   ├── server.ts
│   ├── shared
│   │   ├── catchAsync.ts
│   │   ├── firebase.admin.ts
│   │   ├── pagination.ts
│   │   ├── pick.ts
│   │   ├── prisma.ts
│   │   ├── searchFilter.ts
│   │   └── sendResponse.ts
│   └── workers
│       └── email.worker.ts
├── tsconfig.json
├── uploads
│   └── google.png
└── vercel.json

42 directories, 152 files

```
