const fs = require('fs');
const path = require('path');

function replaceInFile(filepath, replacements) {
    let content = fs.readFileSync(filepath, 'utf8');
    let changed = false;
    for (const [regex, replacement] of replacements) {
        if (regex.test(content)) {
            content = content.replace(regex, replacement);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(filepath, content);
        console.log('Fixed', filepath);
    }
}

// 1. Auth service and common files Cache manager
const cacheReplacements = [
    [/import\s+\{([^}]*)(Cache|CACHE_MANAGER)([^}]*)\}\s+from\s+'@nestjs\/common';/g, (match, p1, p2, p3) => {
        let core = match.replace(/,\s*Cache\s*,?/, ',').replace(/Cache\s*,?/, '').replace(/,\s*CACHE_MANAGER\s*,?/, ',').replace(/CACHE_MANAGER\s*,?/, '');
        core = core.replace(/\{\s*,\s*/, '{ ').replace(/,\s*\}/, ' }');
        return core + "\nimport { CACHE_MANAGER } from '@nestjs/cache-manager';\nimport { Cache } from 'cache-manager';";
    }]
];

replaceInFile('src/auth/auth.service.ts', cacheReplacements);
replaceInFile('src/auth/jwt.strategy.ts', cacheReplacements);
replaceInFile('src/cart/cart.cache.service.ts', cacheReplacements);

// 2. Auth Controller Throttler and JTI
replaceInFile('src/auth/auth.controller.ts', [
    [/@Throttle\(\s*(\d+)\s*,\s*(\d+)\s*\)/g, '@Throttle({ default: { limit: , ttl:  } })'],
    [/user\.jti/g, '(user as any).jti']
]);

// 3. AI Planner ZodError
replaceInFile('src/ai-planner/ai-planner.service.ts', [
    [/error\.errors/g, '(error as any).errors']
]);

// 4. AI Planner Processor
replaceInFile('src/ai-planner/queue/ai-planner.processor.ts', [
    [/@Processor\('ai-planner',\s*\{\s*concurrency:\s*\d+\s*\}\)/g, "@Processor('ai-planner')\n// NOTE: Add @Process concurrency parameter instead if needed"]
]);

// 5. Notifications Gateway
replaceInFile('src/notifications/websocket/notification.gateway.ts', [
    [/import\s+\{\s*Injectable,\s*ExecutionContext,\s*UseGuards.*\s*\}\s+from\s+'@nestjs\/websockets';/g, "import { Injectable, ExecutionContext, UseGuards } from '@nestjs/common';\nimport { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';"]
]);

// 6. Prisma Role in users
replaceInFile('src/users/users.service.ts', [
    [/import\s+\{.*Role.*\}\s+from\s+'@prisma\/client';/g, "import { PrismaClient, Role } from '@prisma/client';"] // Or ignore if it works
]);

// 7. Vendors Service Service duplicate method
replaceInFile('src/vendors/vendor-services/vendor-services.service.ts', [
    [/async findByVendor\(vendorId: number\)\s*\{\s*try\s*\{\s*return await this\.prisma\.vendorService\.findMany\(\{\s*where: \{ vendorId \},\s*\}\);\s*\}\s*catch\s*\(error\)\s*\{/g, "async findByVendorUserId(userId: number) {\ntry {\nconst vendor = await this.prisma.vendor.findUnique({ where: { userId } });\nif (!vendor) return [];\nreturn await this.prisma.vendorService.findMany({ where: { vendorId: vendor.id } });\n} catch(error) {"]
]);

// 8. jwt strategy emit decorator metadata
replaceInFile('src/auth/jwt.strategy.ts', [
    [/import type \{ Cache \} from 'cache-manager';/g, ""] // Just fix double import if any
]);

console.log('Replacements done');
