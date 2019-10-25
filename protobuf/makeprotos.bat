protoc --js_out=import_style=commonjs,binary:. testprotocol.proto
copy testprotocol_pb.js ..\kartta
move testprotocol_pb.js ..\chat
protoc --python_out=. testprotocol.proto
move testprotocol_pb2.py ..\server
