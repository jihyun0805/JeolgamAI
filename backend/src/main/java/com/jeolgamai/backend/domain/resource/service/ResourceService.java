package com.jeolgamai.backend.domain.resource.service;

import com.jeolgamai.backend.domain.resource.dto.ResourceRequest;
import com.jeolgamai.backend.domain.resource.dto.ResourceResponse;
import com.jeolgamai.backend.domain.resource.entity.Resource;
import com.jeolgamai.backend.domain.resource.repository.ResourceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;

    public ResourceService(ResourceRepository resourceRepository) {
        this.resourceRepository = resourceRepository;
    }

    public ResourceResponse create(ResourceRequest request) {
        Resource saved = resourceRepository.save(new Resource(request.team(), request.service(), request.region()));
        return toResponse(saved);
    }

    public List<ResourceResponse> findAll() {
        return resourceRepository.findAll().stream().map(this::toResponse).toList();
    }

    public ResourceResponse findById(Long id) {
        return toResponse(getById(id));
    }

    public ResourceResponse update(Long id, ResourceRequest request) {
        Resource resource = getById(id);
        resource.setTeam(request.team());
        resource.setService(request.service());
        resource.setRegion(request.region());
        return toResponse(resourceRepository.save(resource));
    }

    public void delete(Long id) {
        if (!resourceRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found: " + id);
        }
        resourceRepository.deleteById(id);
    }

    private Resource getById(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found: " + id));
    }

    private ResourceResponse toResponse(Resource resource) {
        return new ResourceResponse(resource.getId(), resource.getTeam(), resource.getService(), resource.getRegion());
    }
}
