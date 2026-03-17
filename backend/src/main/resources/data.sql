SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM recommendations;
DELETE FROM metrics;
DELETE FROM costs;
DELETE FROM resources;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO resources (id, team, service, region, created_at, updated_at) VALUES
    (1, 'search', 'ec2', 'ap-northeast-2', NOW(), NOW()),
    (2, 'payments', 'rds', 'ap-northeast-2', NOW(), NOW()),
    (3, 'platform', 'eks', 'ap-northeast-2', NOW(), NOW()),
    (4, 'media', 'ec2', 'us-east-1', NOW(), NOW()),
    (5, 'ads', 'ecs', 'us-west-2', NOW(), NOW());

INSERT INTO metrics (id, resource_id, cpu_avg, memory_avg, created_at, updated_at) VALUES
    (1, 1, 12.5, 24.0, NOW(), NOW()),
    (2, 2, 18.0, 35.0, NOW(), NOW()),
    (3, 3, 36.0, 61.0, NOW(), NOW()),
    (4, 4, 55.0, 70.0, NOW(), NOW()),
    (5, 5, 67.0, 78.0, NOW(), NOW());

INSERT INTO costs (id, resource_id, monthly_cost, created_at, updated_at) VALUES
    (1, 1, 920.00, NOW(), NOW()),
    (2, 2, 1350.00, NOW(), NOW()),
    (3, 3, 840.00, NOW(), NOW()),
    (4, 4, 1780.00, NOW(), NOW()),
    (5, 5, 2100.00, NOW(), NOW());
